import React from "react";
import ReactDOM from "react-dom/client";
import PongApp from "./PongApp.jsx";
import { CrtOverlay } from "../shared/Icons.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CrtOverlay />
    <PongApp />
  </React.StrictMode>
);
