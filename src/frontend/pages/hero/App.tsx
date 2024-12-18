import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import "tippy.js/dist/tippy.css";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import AnimatedText from "../../components/ui/animated-text";
import History from "./History";
import { HistoryRecord, Pagination } from "./types";

export const App = () => {
    const navigation = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDeepLoading, setIsDeepLoading] = useState(false);
    const [searchResults, setSearchResults] = useState(null);
    const [error, setError] = useState(null);
    const [searchHistory, setSearchHistory] = useState<HistoryRecord[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        cur: 0,
        maxPerPage: 10,
        total: 0,
    });

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
                if (response.status === 401) {
                    navigation("/ui/login");
                }

                if (response.status === 429) {
                    throw new Error(
                        "You have reached the interaction limit. Please try again later."
                    );
                }

                throw new Error(error.statusText);
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

            if (response.status === 401) {
                navigation("/ui/login");
            }

            if (response.status === 429) {
                throw new Error("You have reached the interaction limit. Please try again later.");
            }

            if (response.ok) {
                const result = await response.text();

                setSearchResults(result);
            } else {
                throw new Error(response.statusText);
            }
            addToSearchHistory({ query: searchQuery, type: "deep", timestamp: Date.now() });
        } catch (err) {
            setError("An error occurred during deep search. Please try again.");
        } finally {
            setIsDeepLoading(false);
        }
    };

    const addToSearchHistory = searchItem => {
        setSearchHistory(prev => [searchItem, ...prev]);
    };

    const handleSubmit = (e, type) => {
        e.preventDefault();
        if (searchQuery.length < 3) return;

        if (type === "quick") {
            performQuickSearch();
        } else {
            performDeepSearch();
        }

        setSuggestions([]);
    };

    const isButtonDisabled = searchQuery.length < 3;

    const markedLib = useRef(null);

    useEffect(() => {
        const init = async () => {
            try {
                const authToken = localStorage.getItem("authToken");
                if (!authToken) {
                    return navigation("/ui/login");
                }

                document.title = "Scrapper";

                try {
                    const tippy = (await import("tippy.js")).default;
                    if (tippy) tippy("[data-tippy-content]");
                } catch (err) {
                    console.log(err);
                }

                const { marked } = await import("marked");
                markedLib.current = marked;

                const response = await fetch("api/search-history", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                    },
                });

                if (response.status === 401) {
                    return navigation("/ui/login");
                }

                const history = (await response.json()) || [];

                setPagination(p => ({ ...p, total: history.length }));

                history.sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

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
            } catch (err) {
                console.error(err);
            }
        };

        init();
    }, []);

    const handleClickToHistory = hR => {
        setSearchResults(markedLib.current?.(hR.results) || "");
        setSearchQuery(hR.query);
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const [suggestions, setSuggestions] = useState([]);

    const getSuggestions = e => {
        const searchTerm = e.target.value;

        fetch(`/api/suggestions?q=${searchTerm}`).then(response => {
            return response.text().then(xmlString => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlString, "application/xml");
                const suggestionsArray = Array.from(xmlDoc.getElementsByTagName("suggestion")).map(
                    suggestion => suggestion.getAttribute("data")
                );
                setSuggestions(suggestionsArray);
            });
        });
    };

    const logoRef = useRef<HTMLImageElement>(null);

    return (
        <div className="bg-black w-full min-h-screen text-gray-100">
            <main className="container mx-auto py-4 sm:py-6 lg:py-8 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <h1 className="flex align-middle justify-center gap-[0.5rem] text-2xl sm:text-3xl pb-2 font-bold text-center mb-4 sm:mb-8 tracking-tight main-title border-b-2 border-transparent animate-fade-in-out">
                        <LogoAnimated
                            // isLoading
                            isLoading={isLoading || isDeepLoading}
                        />
                        <AnimatedText text="Scrapper" />
                    </h1>

                    <div className="rounded-xl shadow-2xl sm:py-6 px-2 bg-black">
                        <form onSubmit={e => e.preventDefault()} className="mb-4 sm:mb-6">
                            <div className="flex flex-col sm:flex-row gap-3 search-buttons-container">
                                <div className="relative flex-1">
                                    <Textarea
                                        onKeyDown={e => {
                                            const key = e.key;
                                            if (key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                                handleSubmit(e, "quick");
                                            }
                                        }}
                                        onBlur={e => {
                                            e.target.style.height = "auto";
                                        }}
                                        value={searchQuery}
                                        onChange={e => {
                                            getSuggestions(e);
                                            setSearchQuery(e.target.value);
                                        }}
                                        className="border-slate-700 w-full"
                                        placeholder="Enter your search query..."
                                        required
                                    />

                                    {suggestions.length > 0 &&
                                        !(isDeepLoading || isLoading) &&
                                        searchQuery.trim().length > 0 && (
                                            <ScrollArea className="h-[200px] mt-[0.5rem] w-full rounded-md border p-1 border-slate-700">
                                                {suggestions.map((suggestion, idx) => {
                                                    return (
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSearchQuery(suggestion);
                                                                setSuggestions([]);
                                                            }}
                                                            onKeyDown={e => {
                                                                const key = e.key;
                                                                if (key === "Enter") {
                                                                    setSearchQuery(suggestion);
                                                                    setSuggestions([]);
                                                                }
                                                            }}
                                                            className="cursor-pointer transition-all text-sm rounded-sm block w-full text-start"
                                                            key={idx}>
                                                            {suggestion}
                                                        </Button>
                                                    );
                                                })}
                                            </ScrollArea>
                                        )}
                                </div>

                                <div className="flex align-middle items-start gap-2">
                                    <span
                                        className="max-sm:w-full"
                                        data-tippy-content="Quick Search performs parallel searches across Google, Bing, and DuckDuckGo, combining results and using AI to format them into a comprehensive summary.">
                                        <Button
                                            variant="default"
                                            className="relative max-sm:w-full"
                                            onClick={e => handleSubmit(e, "quick")}
                                            disabled={
                                                isButtonDisabled || isLoading || isDeepLoading
                                            }>
                                            <div className="flex align-middle justify-center origin-center">
                                                <span>
                                                    {isLoading ? "Searching..." : "Quick Search"}
                                                </span>
                                                {isLoading && (
                                                    <div className="animate-spin absolute right-2 top-2">
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
                                            </div>
                                        </Button>
                                    </span>

                                    <span
                                        className="max-sm:w-full"
                                        data-tippy-content="Deep Search performs an extensive Google search, recursively analyzing all inner links to gather comprehensive information. This deep analysis is then processed by AI to provide detailed, in-depth results.">
                                        <Button
                                            className="relative max-sm:w-full"
                                            variant="default"
                                            onClick={e => handleSubmit(e, "deep")}
                                            disabled={
                                                isButtonDisabled || isDeepLoading || isLoading
                                            }>
                                            <div className="flex align-middle justify-center origin-center">
                                                <span>
                                                    {isDeepLoading ? "Searching..." : "Deep Search"}
                                                </span>
                                                {isDeepLoading && (
                                                    <div className="animate-spin absolute right-2 top-2">
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
                                            </div>
                                        </Button>
                                    </span>
                                </div>
                            </div>
                        </form>

                        {error && (
                            <div className="p-3 sm:p-4 mb-4 text-sm sm:text-base text-red-300 bg-red-900/50 rounded-lg border border-red-700">
                                {error}
                            </div>
                        )}

                        {!searchResults && !error && !(isLoading || isDeepLoading) && (
                            <div className="text-center py-6 sm:py-8">
                                <p className="text-slate-400">
                                    {searchQuery.trim().length > 3
                                        ? "Press Cmd+Enter"
                                        : "Enter a search query to get started"}
                                </p>
                            </div>
                        )}

                        {isLoading || isDeepLoading ? (
                            <div className="text-center py-6 sm:py-8">
                                <p className="text-slate-400">Scrapping the web for get you info</p>
                            </div>
                        ) : (
                            searchResults && (
                                <div
                                    className="my-4 sm:my-6 space-y-4 prose prose-invert max-w-none text-sm sm:text-base"
                                    dangerouslySetInnerHTML={{
                                        __html: markedLib
                                            .current?.(searchResults)
                                            .replace(
                                                /<a /g,
                                                '<a target="_blank" rel="noopener noreferrer" '
                                            ),
                                    }}
                                />
                            )
                        )}
                    </div>

                    <History
                        disabled={isLoading || isDeepLoading}
                        history={searchHistory}
                        handleClickToHistory={handleClickToHistory}
                        pagination={pagination}
                        setPagination={setPagination}
                    />
                </div>
            </main>
        </div>
    );
};

const LogoAnimated = ({ isLoading }: { isLoading: boolean }) => {
    return (
        <svg
            className={`transition-all${isLoading ? " animate-network" : ""}`}
            width={isLoading ? 80 : 40}
            height={isLoading ? 80 : 40}
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg">
            {/* Magnifying Glass Handle */}
            <line
                x1="135"
                y1="135"
                x2="180"
                y2="180"
                stroke="#60a5fa"
                strokeWidth="12"
                strokeLinecap="round"
            />

            {/* Glass Circle */}
            <circle cx="90" cy="90" r="60" fill="none" stroke="#60a5fa" strokeWidth="8" />

            {/* Network Groups */}
            <g className={isLoading ? "animate-network" : ""}>
                {/* Network Lines */}
                <path
                    d="M70,70 L110,90 L80,110 L70,70"
                    stroke="#4299E1"
                    strokeWidth="2"
                    fill="none"
                />

                {/* Network Nodes */}
                <circle cx="70" cy="70" r="4" fill="#4299E1" />
                <circle cx="110" cy="90" r="4" fill="#4299E1" />
                <circle cx="80" cy="110" r="4" fill="#4299E1" />
            </g>
        </svg>
    );
};
