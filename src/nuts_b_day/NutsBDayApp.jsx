import ChildhoodMemories from "./ChildhoodMemories.jsx";
import "./nuts_b_day.css";

// A standalone page: no header, back button or links anywhere, so there's
// nothing that navigates away from the photos.
export default function NutsBDayApp() {
  return (
    <main className="nuts-page">
      <ChildhoodMemories />
    </main>
  );
}
