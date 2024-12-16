import { createRoot } from "react-dom/client";
import "./styles/main.css";
import { App } from "./pages/hero/App";
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthPage } from "./pages/auth/AuthPage";
import React, { ReactElement, useEffect, useRef } from "react";
import HeroSketch from "./components/three.js/HeroSketch";
import Snow from "./pages/snow-example/Snow";

const Wrapper = ({
    children,
    keepMobile = false,
}: {
    children: ReactElement;
    keepMobile?: boolean;
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const heroSketchRef = useRef<HeroSketch>(null);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 756 && !keepMobile) {
                if (heroSketchRef.current) {
                    heroSketchRef.current.dispose();
                    heroSketchRef.current = null;
                }
            } else {
                if (!heroSketchRef.current && canvas) {
                    const heroSketch = new HeroSketch(canvas);
                    heroSketchRef.current = heroSketch;
                }
            }
        };

        const canvas = canvasRef.current;

        window.addEventListener("resize", handleResize);

        // Initial check
        handleResize();

        return () => {
            window.removeEventListener("resize", handleResize);
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
    <BrowserRouter>
        <Routes>
            <Route
                path="/ui"
                element={
                    <Wrapper>
                        <App />
                    </Wrapper>
                }
            />
            <Route
                path="/ui/login"
                element={
                    <Wrapper>
                        <AuthPage />
                    </Wrapper>
                }
            />
            <Route
                path="/snow-example"
                element={
                    <Wrapper keepMobile>
                        <Snow />
                    </Wrapper>
                }
            />
        </Routes>
    </BrowserRouter>
);
