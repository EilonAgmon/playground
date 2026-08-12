import React from "react";
import ReactDOM from "react-dom/client";
import WheelsApp from "./WheelsApp.jsx";
import { AppFrame } from "../shared/AppFrame.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppFrame>
      <WheelsApp />
    </AppFrame>
  </React.StrictMode>
);
