// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { SupabaseDataProvider } from "@/contexts/SupabaseDataContext";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SupabaseAuthProvider>
      <SupabaseDataProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SupabaseDataProvider>
    </SupabaseAuthProvider>
  </React.StrictMode>
);