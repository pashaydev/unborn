<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import HeroSketch from "./components/three.js/HeroSketch";
    import App from "./pages/hero/App.svelte";
    import AuthPage from "./pages/auth/AuthPage.svelte";
    import "./styles/main.css";

    let { url } = $props();

    let canvasRef: HTMLCanvasElement = $state(null);
    let heroSketchRef: HeroSketch | null = $state(null);

    const handleResize = () => {
        if (window.innerWidth < 756) {
            if (heroSketchRef) {
                heroSketchRef.dispose();
                heroSketchRef = null;
            }
        } else {
            if (!heroSketchRef && canvasRef) {
                heroSketchRef = new HeroSketch(canvasRef);
            }
        }
    };

    onMount(() => {
        window.addEventListener("resize", handleResize);
        handleResize();
    });

    onDestroy(() => {
        window.removeEventListener("resize", handleResize);
        if (heroSketchRef) heroSketchRef.dispose();
    });
</script>

<canvas
    bind:this={canvasRef}
    class="w-full h-full fixed left-0 right-0 top-0 bottom-0 z-0 pointer-events-none"
></canvas>

{#if url === "/ui"}
    <App />
{/if}
{#if url === "/ui/login"}
    <AuthPage />
{/if}
