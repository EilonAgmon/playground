import React from "react";
import ReactDOM from "react-dom/client";
import TerminalApp from "./TerminalApp.jsx";
import { AppFrame } from "../shared/AppFrame.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppFrame>
      <TerminalApp />
    </AppFrame>
  </React.StrictMode>
);
