import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import LoginGate from "./LoginGate.jsx";
import CitySearch from "./CitySearch.jsx";
import AttractionSearch from "./AttractionSearch.jsx";
import SavedList from "./SavedList.jsx";
import "./travel.css";

const USERNAME_KEY = "travel_username";

function lastCityKey(username) {
  return `travel_last_city_${username}`;
}

export default function TravelApp() {
  const [username, setUsername] = useState(() => localStorage.getItem(USERNAME_KEY));
  const [city, setCity] = useState(() => {
    if (!username) return null;
    const raw = localStorage.getItem(lastCityKey(username));
    return raw ? JSON.parse(raw) : null;
  });
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (!username || !city) return;
    let cancelled = false;
    setLoadingItems(true);
    api.listTravelItems(username, city.city).then((data) => {
      if (!cancelled) {
        setItems(data.items || []);
        setLoadingItems(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username, city]);

  function handleLogin(name) {
    localStorage.setItem(USERNAME_KEY, name);
    setUsername(name);
  }

  function handleSwitchUser() {
    localStorage.removeItem(USERNAME_KEY);
    setUsername(null);
    setCity(null);
    setItems([]);
  }

  function handleSelectCity(selected) {
    localStorage.setItem(lastCityKey(username), JSON.stringify(selected));
    setCity(selected);
  }

  function handleChangeCity() {
    setCity(null);
    setItems([]);
  }

  async function handleAddAttraction(result) {
    const data = await api.addTravelItem({
      username,
      city: city.city,
      country: city.country,
      title: result.title,
      extract: result.extract,
      image: result.image,
      officialUrl: result.officialUrl,
      wikipediaUrl: result.wikipediaUrl,
    });
    if (!data) return;
    setItems((prev) => [
      {
        id: data.id,
        title: result.title,
        extract: result.extract,
        image_url: result.image,
        official_url: result.officialUrl,
        wikipedia_url: result.wikipediaUrl,
      },
      ...prev,
    ]);
  }

  async function handleDeleteAttraction(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await api.deleteTravelItem(id, username);
  }

  if (!username) {
    return <LoginGate onLogin={handleLogin} />;
  }

  if (!city) {
    return <CitySearch onSelect={handleSelectCity} />;
  }

  return (
    <div id="cityScreen">
      <header className="cityHeader">
        <div>
          <h1 className="glow display-font small">
            {city.city}
            <span className="countryTag">{city.country}</span>
          </h1>
        </div>
        <div className="headerActions">
          <button type="button" onClick={handleChangeCity}>
            change city
          </button>
          <button type="button" onClick={handleSwitchUser}>
            not {username}?
          </button>
        </div>
      </header>

      <AttractionSearch city={city.city} onAdd={handleAddAttraction} />

      <section className="savedSection">
        <h2>{username}&rsquo;s list</h2>
        {loadingItems ? <p className="searching">loading&hellip;</p> : <SavedList items={items} onDelete={handleDeleteAttraction} />}
      </section>

      <p className="back">
        <a href="../">&larr; back to the portal</a>
      </p>
    </div>
  );
}
