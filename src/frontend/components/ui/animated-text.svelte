<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    interface AnimatedTextProps {
        text: string;
        duration?: number;
        delay?: number;
    }

    const { text, duration = 2000, delay = 50 }: AnimatedTextProps = $props();

    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let displayText = $state(" ".repeat(text.length));
    let timeouts: Timer[] = [];

    const animateLetter = (index: number, currentIteration: number) => {
        const iterations = Math.floor(duration / delay);

        if (currentIteration >= iterations) {
            displayText =
                displayText.substring(0, index) + text[index] + displayText.substring(index + 1);
            return;
        }

        const randomChar = characters[Math.floor(Math.random() * characters.length)];
        displayText =
            displayText.substring(0, index) + randomChar + displayText.substring(index + 1);

        timeouts.push(
            setTimeout(() => {
                animateLetter(index, currentIteration + 1);
            }, delay)
        );
    };

    onMount(() => {
        // Start animation for each letter
        text.split("").forEach((_, index) => {
            timeouts.push(
                setTimeout(
                    () => {
                        animateLetter(index, 0);
                    },
                    index * (delay * 2)
                )
            );
        });
    });

    onDestroy(() => {
        timeouts.forEach(timeout => clearTimeout(timeout));
    });
</script>

<div class="animated-text">
    {#each displayText.split("") as char, index (index)}
        <span class="animated-letter">
            {char}
        </span>
    {/each}
</div>

<style>
    .animated-text {
        font-family: monospace;
        font-size: 2rem;
        font-weight: bold;
        display: inline-block;
        font-family: monospace;
    }
    .animated-letter {
        display: inline-block;
        transition: color 0.2s ease;
    }
    .animated-letter:hover {
        color: #60a5fa;
        transform: scale(1.1);
    }
</style>
