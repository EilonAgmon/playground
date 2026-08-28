import React from "react";
import ReactDOM from "react-dom/client";
import WaypointApp from "./WaypointApp.jsx";
import { AppFrame } from "../shared/AppFrame.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppFrame>
      <WaypointApp />
    </AppFrame>
  </React.StrictMode>
);
