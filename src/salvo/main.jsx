import React from "react";
import ReactDOM from "react-dom/client";
import SalvoApp from "./SalvoApp.jsx";
import { AppFrame } from "../shared/AppFrame.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppFrame>
      <SalvoApp />
    </AppFrame>
  </React.StrictMode>
);
