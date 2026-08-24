import React from "react";
import ReactDOM from "react-dom/client";
import ReelsApp from "./ReelsApp.jsx";
import { AppFrame } from "../shared/AppFrame.jsx";
import "../shared/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppFrame>
      <ReelsApp />
    </AppFrame>
  </React.StrictMode>
);
