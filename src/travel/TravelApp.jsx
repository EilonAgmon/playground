import { useEffect, useState } from "react";
import { api } from "../shared/api.js";
import LoginGate from "./LoginGate.jsx";
import CityDashboard from "./CityDashboard.jsx";
import CitySearch from "./CitySearch.jsx";
import CityScreen from "./CityScreen.jsx";
import "./travel.css";

const USERNAME_KEY = "travel_username";

export default function TravelApp() {
  const [username, setUsername] = useState(() => localStorage.getItem(USERNAME_KEY));
  const [view, setView] = useState("dashboard"); // "dashboard" | "search" | "city"
  const [city, setCity] = useState(null);

  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  function loadCitiesSummary() {
    if (!username) return;
    setCitiesLoading(true);
    api.travelCitiesSummary(username).then((data) => {
      setCities(data.cities || []);
      setCitiesLoading(false);
    });
  }

  useEffect(() => {
    if (username && view === "dashboard") loadCitiesSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, view]);

  useEffect(() => {
    if (!username || view !== "city" || !city) return;
    let cancelled = false;
    setItemsLoading(true);
    api.listTravelItems(username, city.city).then((data) => {
      if (!cancelled) {
        setItems(data.items || []);
        setItemsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username, view, city]);

  function handleLogin(name) {
    localStorage.setItem(USERNAME_KEY, name);
    setUsername(name);
  }

  function handleSwitchUser() {
    localStorage.removeItem(USERNAME_KEY);
    setUsername(null);
    setView("dashboard");
    setCity(null);
    setCities([]);
    setItems([]);
  }

  function handleOpenCity(selected) {
    setCity(selected);
    setView("city");
  }

  function handleAddNew() {
    setView("search");
  }

  function handleSelectNewCity(selected) {
    setCity(selected);
    setView("city");
  }

  function handleBackToDashboard() {
    setCity(null);
    setItems([]);
    setView("dashboard");
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

  if (view === "search") {
    return <CitySearch onSelect={handleSelectNewCity} onBack={handleBackToDashboard} />;
  }

  if (view === "city" && city) {
    return (
      <CityScreen
        city={city}
        items={items}
        loading={itemsLoading}
        onAdd={handleAddAttraction}
        onDelete={handleDeleteAttraction}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return (
    <CityDashboard
      username={username}
      cities={cities}
      loading={citiesLoading}
      onOpenCity={handleOpenCity}
      onAddNew={handleAddNew}
      onSwitchUser={handleSwitchUser}
    />
  );
}
