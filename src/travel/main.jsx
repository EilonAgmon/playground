import React from "react";
import ReactDOM from "react-dom/client";
import TravelApp from "./TravelApp.jsx";
import { CrtOverlay } from "../shared/Icons.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CrtOverlay />
    <TravelApp />
  </React.StrictMode>
);
