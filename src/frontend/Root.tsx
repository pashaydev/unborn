import { createRoot } from "react-dom/client";
import "./styles/main.css";
import { App } from "./pages/hero/App";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthPage } from "./pages/auth/AuthPage";
import React, { ReactElement, useEffect, useRef } from "react";
import HeroSketch from "./components/three.js/HeroSketch";

const Wrapper = ({ children }: { children: ReactElement }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const heroSketchRef = useRef<HeroSketch>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const heroSketch = new HeroSketch(canvas);
            heroSketchRef.current = heroSketch;
        }
        return () => {
            if (heroSketchRef.current) heroSketchRef.current.dispose();
        };
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="w-full h-full fixed left-0 right-0 top-0 bottom-0 z-0 pointer-events-none"></canvas>
            {children}
        </>
    );
};

createRoot(document.getElementById("root")!).render(
    <Wrapper>
        <BrowserRouter>
            <Routes>
                <Route path="/ui" element={<App />} />
                <Route path="/ui/login" element={<AuthPage />} />
            </Routes>
        </BrowserRouter>
    </Wrapper>
);
