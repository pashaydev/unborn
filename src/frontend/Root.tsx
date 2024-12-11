import { createRoot } from "react-dom/client";
import "./styles/main.css";
import { App } from "./App";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthPage } from "./AuthPage";
import React from "react";

createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <Routes>
            <Route path="/ui" element={<App />} />
            <Route path="/ui-login" element={<AuthPage />} />
        </Routes>
    </BrowserRouter>
);
