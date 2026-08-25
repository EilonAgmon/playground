import React from "react";
import ReactDOM from "react-dom/client";
import VineApp from "./VineApp.jsx";
import { AppFrame } from "../shared/AppFrame.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppFrame>
      <VineApp />
    </AppFrame>
  </React.StrictMode>
);
