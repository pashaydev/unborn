import React, { useState, useEffect, useRef } from "react";
import "./styles/main.css";
import { useNavigate } from "react-router";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css"; // optional for styling
import "tippy.js/animations/scale.css";

export const App = () => {
    const navigation = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDeepLoading, setIsDeepLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [error, setError] = useState(null);
    const [searchHistory, setSearchHistory] = useState([]);

    const performQuickSearch = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("api/search?q=" + searchQuery, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
            });

            if (response.ok) {
                const result = await response.text();

                setSearchResults(result);

                addToSearchHistory({
                    query: searchQuery,
                    type: "quick",
                    timestamp: Date.now(),
                    results: result,
                });
            } else {
                const error = await response.json();
                if (error.message === "InteractionLimit") {
                    throw new Error(
                        "You have reached the interaction limit. Please try again later."
                    );
                }

                if (error.message === "Not authorize") {
                    navigation("/ui-login");
                }

                throw new Error(error.message);
            }
        } catch (err) {
            setError(err.message || "An error occurred during quick search. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const performDeepSearch = async () => {
        setIsDeepLoading(true);
        setError(null);

        try {
            const response = await fetch("api/deep-search?q=" + searchQuery, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
            });

            const result = await response.text();

            setSearchResults(result);

            addToSearchHistory({ query: searchQuery, type: "deep", timestamp: Date.now() });
        } catch (err) {
            setError("An error occurred during deep search. Please try again.");
        } finally {
            setIsDeepLoading(false);
        }
    };

    const addToSearchHistory = searchItem => {
        setSearchHistory(prev => [searchItem, ...prev].slice(0, 10)); // Keep last 10 searches
    };

    const handleSubmit = (e, type) => {
        e.preventDefault();
        if (searchQuery.length < 3) return;

        if (type === "quick") {
            performQuickSearch();
        } else {
            performDeepSearch();
        }
    };

    const isButtonDisabled = searchQuery.length < 3;

    const markedLib = useRef();

    useEffect(() => {
        const init = async () => {
            const { marked } = await import("marked");
            markedLib.current = marked;

            const response = await fetch("api/search-history", {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
            });
            const history = (await response.json()) || [];
            setSearchHistory(
                history.map(hR => {
                    return {
                        query: hR.query,
                        type: hR.action_name === "scrapper" ? "quick" : "deep",
                        timestamp: new Date(hR.created_at).getTime(),
                        results: hR.results,
                    };
                })
            );

            // set title
            document.title = "Scrapper";
        };

        tippy("[data-tippy-content]");

        init();
    }, []);

    const handleClickToHistory = hR => {
        setSearchResults(markedLib.current?.(hR.results) || "");
        setSearchQuery(hR.query);
    };

    return (
        <div className="bg-black w-full min-h-screen text-gray-100">
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-8 tracking-tight main-title">
                        Scrapper
                    </h1>

                    <div className="bg-gray-900 rounded-xl shadow-2xl p-4 sm:p-6 border border-slate-700">
                        <form onSubmit={e => e.preventDefault()} className="mb-4 sm:mb-6">
                            <div className="flex flex-col sm:flex-row gap-3 search-buttons-container">
                                <div className="relative flex-1">
                                    <textarea
                                        onKeyDown={e => {
                                            const key = e.key;
                                            if (key === "Enter" && e.ctrlKey) {
                                                handleSubmit(e, "quick");
                                            }
                                        }}
                                        onFocusCapture={e => {
                                            if (e.target.value.length > 15) {
                                                e.target.style.height = "150px";
                                            } else {
                                                e.target.style.height = "auto";
                                            }
                                        }}
                                        onBlur={e => {
                                            e.target.style.height = "auto";
                                        }}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="search-input w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base transition-all duration-200"
                                        placeholder="Enter your search query..."
                                        required
                                    />
                                </div>

                                <div className="flex align-middle items-start gap-2">
                                    <span data-tippy-content="Quick Search performs parallel searches across Google, Bing, and DuckDuckGo, combining results and using AI to format them into a comprehensive summary.">
                                        <button
                                            onClick={e => handleSubmit(e, "quick")}
                                            disabled={isButtonDisabled || isLoading}
                                            className="button-primary search-button px-2 sm:px-3 py-1 sm:py-2 h-fit rounded-lg text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <span>
                                                {isLoading ? "Searching..." : "Quick Search"}
                                            </span>
                                            {isLoading && (
                                                <div className="animate-spin h-5 w-5">
                                                    <svg
                                                        stroke="currentColor"
                                                        fill="currentColor"
                                                        strokeWidth="0"
                                                        viewBox="0 0 24 24"
                                                        height="100%"
                                                        width="100%"
                                                        xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2 11h5v2H2zm15 0h5v2h-5zm-6 6h2v5h-2zm0-15h2v5h-2zM4.222 5.636l1.414-1.414 3.536 3.536-1.414 1.414zm15.556 12.728-1.414 1.414-3.536-3.536 1.414-1.414zm-12.02-3.536 1.414 1.414-3.536 3.536-1.414-1.414zm7.07-7.071 3.536-3.535 1.414 1.415-3.536 3.535z"></path>
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    </span>

                                    <span data-tippy-content="Deep Search performs an extensive Google search, recursively analyzing all inner links to gather comprehensive information. This deep analysis is then processed by AI to provide detailed, in-depth results.">
                                        <button
                                            onClick={e => handleSubmit(e, "deep")}
                                            disabled={isButtonDisabled || isDeepLoading}
                                            className="button-secondary search-button px-2 sm:px-3 py-1 sm:py-2 h-fit rounded-lg text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <span>
                                                {isDeepLoading ? "Searching..." : "Deep Search"}
                                            </span>
                                            {isDeepLoading && (
                                                <div className="animate-spin h-5 w-5">
                                                    <svg
                                                        stroke="currentColor"
                                                        fill="currentColor"
                                                        strokeWidth="0"
                                                        viewBox="0 0 24 24"
                                                        height="100%"
                                                        width="100%"
                                                        xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2 11h5v2H2zm15 0h5v2h-5zm-6 6h2v5h-2zm0-15h2v5h-2zM4.222 5.636l1.414-1.414 3.536 3.536-1.414 1.414zm15.556 12.728-1.414 1.414-3.536-3.536 1.414-1.414zm-12.02-3.536 1.414 1.414-3.536 3.536-1.414-1.414zm7.07-7.071 3.536-3.535 1.414 1.415-3.536 3.535z"></path>
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    </span>
                                </div>
                            </div>
                        </form>

                        {error && (
                            <div className="p-3 sm:p-4 mb-4 text-sm sm:text-base text-red-300 bg-red-900/50 rounded-lg border border-red-700">
                                {error}
                            </div>
                        )}

                        {!searchResults && !error && (
                            <div className="text-center py-6 sm:py-8">
                                <p className="text-slate-400">
                                    Enter a search query to get started
                                </p>
                            </div>
                        )}

                        {searchResults && (
                            <div
                                className="mt-4 sm:mt-6 space-y-4 prose prose-invert max-w-none text-sm sm:text-base"
                                dangerouslySetInnerHTML={{
                                    __html: markedLib.current?.(searchResults),
                                }}
                            />
                        )}
                    </div>

                    {searchHistory.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-lg mb-1">Search History</h4>

                            {searchHistory.map((item, index) => (
                                <button
                                    onClick={() => handleClickToHistory(item)}
                                    key={index}
                                    className="block bg-gray-800 p-2 my-2 rounded">
                                    <p className="text-start">
                                        {item.query} - {item.type} search
                                    </p>
                                    <time className="text-gray-400 text-start w-full block">
                                        {new Date(item.timestamp).toLocaleString("en-US", {
                                            month: "short",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </time>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
