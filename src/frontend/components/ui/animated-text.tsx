import React, { useEffect, useState } from "react";
import "./animated-text.css";

interface AnimatedTextProps {
    text: string;
    duration?: number; // Duration in milliseconds
    delay?: number; // Delay between each letter in milliseconds
}

const AnimatedText: React.FC<AnimatedTextProps> = ({ text, duration = 2000, delay = 50 }) => {
    const [displayText, setDisplayText] = useState<string>("");
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

    useEffect(() => {
        let timeouts: Timer[] = [];
        const finalText = text;
        const iterations = Math.floor(duration / delay);

        const animateLetter = (index: number, currentIteration: number) => {
            if (currentIteration >= iterations) {
                setDisplayText(prev => {
                    const text =
                        prev.substring(0, index) + finalText[index] + prev.substring(index + 1);

                    return text;
                });
                return;
            }

            const randomChar = characters[Math.floor(Math.random() * characters.length)];
            setDisplayText(
                prev => prev.substring(0, index) + randomChar + prev.substring(index + 1)
            );

            timeouts.push(
                setTimeout(() => {
                    animateLetter(index, currentIteration + 1);
                }, delay)
            );
        };

        // Initialize display text with spaces
        setDisplayText(" ".repeat(finalText.length));

        // Start animation for each letter
        finalText.split("").forEach((_, index) => {
            timeouts.push(
                setTimeout(() => {
                    animateLetter(index, 0);
                }, index * (delay * 2))
            );
        });

        return () => {
            timeouts.forEach(timeout => clearTimeout(timeout));
        };
    }, [text, duration, delay]);

    return (
        <div className="animated-text">
            {displayText.split("").map((char, index) => (
                <span key={index} className="animated-letter">
                    {char}
                </span>
            ))}
        </div>
    );
};

export default AnimatedText;
