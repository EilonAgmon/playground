import React from "react";
import ReactDOM from "react-dom/client";
import BackofficeApp from "./BackofficeApp.jsx";
import { CrtOverlay } from "../shared/Icons.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CrtOverlay />
    <BackofficeApp />
  </React.StrictMode>
);
