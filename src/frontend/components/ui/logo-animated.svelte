<script lang="ts">
    type $$props = {
        isLoading: boolean;
    };
    let { isLoading }: $$props = $props();
</script>

<svg
    class={`transition-all${isLoading ? " animate-network" : ""}`}
    width={isLoading ? 80 : 40}
    height={isLoading ? 80 : 40}
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
>
    <!-- Magnifying Glass Handle  -->
    <line
        x1="135"
        y1="135"
        x2="180"
        y2="180"
        stroke="#60a5fa"
        stroke-width="12"
        stroke-linecap="round"
    />

    <!-- Glass Circle  -->
    <circle cx="90" cy="90" r="60" fill="none" stroke="#60a5fa" stroke-width="8" />

    <!-- Network Groups  -->
    <g class={isLoading ? "animate-network" : ""}>
        <!-- Network Lines  -->
        <path d="M70,70 L110,90 L80,110 L70,70" stroke="#4299E1" stroke-width="2" fill="none" />

        <!-- Network Nodes  -->
        <circle cx="70" cy="70" r="4" fill="#4299E1" />
        <circle cx="110" cy="90" r="4" fill="#4299E1" />
        <circle cx="80" cy="110" r="4" fill="#4299E1" />
    </g>
</svg>
