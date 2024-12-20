<script lang="ts">
    import "tippy.js/dist/tippy.css";
    import Textarea from "../../components/ui/textarea.svelte";
    import Button from "../../components/ui/button.svelte";
    import AnimatedText from "../../components/ui/animated-text.svelte";
    import History from "./History.svelte";
    import type { HistoryRecord, Pagination } from "./types";
    import LogoAnimated from "../../components/ui/logo-animated.svelte";

    let searchQuery = $state("");
    let isLoading = $state(false);
    let isDeepLoading = $state(false);
    let searchResults = $state(null);
    let error = $state(null);
    let searchHistory = $state<HistoryRecord[]>([]);
    let pagination = $state<Pagination>({
        cur: 0,
        maxPerPage: 10,
        total: 0,
    });
    function setPagination(p: Pagination) {
        pagination = { ...pagination, ...p };
    }
    let suggestions = $state([]);
    let markedLib = $state(null);

    let isButtonDisabled = $state(false);

    $effect(() => {
        isButtonDisabled = searchQuery.length < 3 || isLoading || isDeepLoading;
    });

    async function performQuickSearch() {
        isLoading = true;
        error = null;

        try {
            const response = await fetch(`api/search?q=${searchQuery}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
            });

            if (response.ok) {
                const result = await response.text();
                searchResults = result;

                addToSearchHistory({
                    query: searchQuery,
                    type: "quick",
                    timestamp: Date.now(),
                    results: result,
                });
            } else {
                if (response.status === 401) {
                    window.location.href = "/ui/login";
                }

                if (response.status === 429) {
                    throw new Error(
                        "You have reached the interaction limit. Please try again later."
                    );
                }

                throw new Error(response.statusText);
            }
        } catch (err) {
            error = err.message || "An error occurred during quick search. Please try again.";
        } finally {
            isLoading = false;
        }
    }

    async function performDeepSearch() {
        isDeepLoading = true;
        error = null;

        try {
            const response = await fetch(`api/deep-search?q=${searchQuery}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                },
            });

            if (response.status === 401) {
                window.location.href = "/ui/login";
            }

            if (response.status === 429) {
                throw new Error("You have reached the interaction limit. Please try again later.");
            }

            if (response.ok) {
                const result = await response.text();
                searchResults = result;
            } else {
                throw new Error(response.statusText);
            }

            addToSearchHistory({
                query: searchQuery,
                type: "deep",
                timestamp: Date.now(),
            });
        } catch (err) {
            error = "An error occurred during deep search. Please try again.";
        } finally {
            isDeepLoading = false;
        }
    }

    function addToSearchHistory(searchItem) {
        searchHistory = [searchItem, ...searchHistory];
    }

    function handleSubmit(e: Event, type: "quick" | "deep") {
        e.preventDefault();
        if (searchQuery.length < 3) return;

        if (type === "quick") {
            performQuickSearch();
        } else {
            performDeepSearch();
        }

        suggestions = [];
    }

    async function getSuggestions(e) {
        const searchTerm = e.target.value;

        searchQuery = searchTerm;

        const response = await fetch(`/api/suggestions?q=${searchTerm}`);
        const xmlString = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");
        suggestions = Array.from(xmlDoc.getElementsByTagName("suggestion")).map(suggestion =>
            suggestion.getAttribute("data")
        );
    }

    function handleClickToHistory(hR) {
        searchResults = markedLib?.(hR.results) || "";
        searchQuery = hR.query;
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    // Lifecycle
    $effect(() => {
        const init = async () => {
            try {
                const authToken = localStorage.getItem("authToken");
                if (!authToken) {
                    window.location.href = "/ui/login";
                    return;
                }

                document.title = "Scrapper";

                try {
                    const tippy = (await import("tippy.js")).default;
                    if (tippy) tippy("[data-tippy-content]");
                } catch (err) {
                    console.log(err);
                }

                const { marked } = await import("marked");
                markedLib = marked;

                const response = await fetch("api/search-history", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
                    },
                });

                if (response.status === 401) {
                    window.location.href = "/ui/login";
                    return;
                }

                const history = (await response.json()) || [];
                pagination = { ...pagination, total: history.length };

                history.sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                searchHistory = history.map(hR => ({
                    query: hR.query,
                    type: hR.action_name === "scrapper" ? "quick" : "deep",
                    timestamp: new Date(hR.created_at).getTime(),
                    results: hR.results,
                }));
            } catch (err) {
                console.error(err);
            }
        };

        init();
    });
</script>

<div class="bg-black w-full min-h-screen text-gray-100">
    <main class="container mx-auto py-4 sm:py-6 lg:py-8 relative z-10">
        <div class="max-w-4xl mx-auto">
            <h1
                class="flex align-middle justify-center gap-[0.5rem] text-2xl sm:text-3xl pb-2 font-bold text-center mb-4 sm:mb-8 tracking-tight main-title border-b-2 border-transparent animate-fade-in-out"
            >
                <LogoAnimated isLoading={isLoading || isDeepLoading} />
                <AnimatedText text="Scrapper" />
            </h1>

            <div class="rounded-xl shadow-2xl sm:py-6 px-2 bg-black">
                <form onsubmit={e => e.preventDefault()} class="mb-4 sm:mb-6">
                    <div class="flex flex-col sm:flex-row gap-3 search-buttons-container">
                        <div class="relative flex-1">
                            <Textarea
                                onkeydown={e => {
                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        handleSubmit(e, "quick");
                                    }
                                }}
                                onblur={e => {
                                    e.target.style.height = "auto";
                                }}
                                value={searchQuery}
                                oninput={getSuggestions}
                                class="border-slate-700 w-full p-2"
                                placeholder="Enter your search query..."
                                required
                            />

                            {#if suggestions.length > 0}
                                <div
                                    class="suggestions max-h-[8rem] h-[8rem] overflow-y-scroll mt-[0.5rem] w-ful rounded-md border p-1 border-slate-700"
                                >
                                    {#each suggestions as suggestion, idx}
                                        <Button
                                            variant="ghost"
                                            onclick={() => {
                                                searchQuery = suggestion;
                                                suggestions = [];
                                            }}
                                            class="cursor-pointer block transition-all text-sm rounded-sm w-full text-start"
                                        >
                                            {suggestion}
                                        </Button>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <div class="flex align-middle items-start gap-2">
                            <span
                                class="max-sm:w-full"
                                data-tippy-content="Quick Search performs parallel searches across Google, Bing, and DuckDuckGo, combining results and using AI to format them into a comprehensive summary."
                            >
                                <Button
                                    variant="default"
                                    class="relative max-sm:w-full"
                                    onclick={e => handleSubmit(e, "quick")}
                                    disabled={isButtonDisabled}
                                >
                                    <div class="flex align-middle justify-center origin-center">
                                        <span>{isLoading ? "Searching..." : "Quick Search"}</span>
                                    </div>
                                </Button>
                            </span>

                            <span
                                class="max-sm:w-full"
                                data-tippy-content="Deep Search performs an extensive Google search, recursively analyzing all inner links to gather comprehensive information."
                            >
                                <Button
                                    variant="default"
                                    class="relative max-sm:w-full"
                                    onclick={e => handleSubmit(e, "deep")}
                                    disabled={isButtonDisabled}
                                >
                                    <div class="flex align-middle justify-center origin-center">
                                        <span>{isDeepLoading ? "Searching..." : "Deep Search"}</span
                                        >
                                    </div>
                                </Button>
                            </span>
                        </div>
                    </div>
                </form>

                {#if error}
                    <div
                        class="p-3 sm:p-4 mb-4 text-sm sm:text-base text-red-300 bg-red-900/50 rounded-lg border border-red-700"
                    >
                        {error}
                    </div>
                {/if}

                {#if !searchResults && !error && !(isLoading || isDeepLoading)}
                    <div class="text-center py-6 sm:py-8">
                        <p class="text-slate-400">
                            {searchQuery?.trim()?.length > 3
                                ? "Press Cmd+Enter"
                                : "Enter a search query to get started"}
                        </p>
                    </div>
                {/if}

                {#if isLoading || isDeepLoading}
                    <div class="text-center py-6 sm:py-8">
                        <p class="text-slate-400">Scrapping the web for get you info</p>
                    </div>
                {:else if searchResults}
                    <div
                        class="my-4 sm:my-6 space-y-4 prose prose-invert max-w-none text-sm sm:text-base"
                    >
                        {@html markedLib?.(searchResults)?.replace(
                            /<a /g,
                            '<a target="_blank" rel="noopener noreferrer" '
                        )}
                    </div>
                {/if}
            </div>

            <History
                disabled={isLoading || isDeepLoading}
                history={searchHistory}
                {handleClickToHistory}
                {pagination}
                {setPagination}
            />
        </div>
    </main>
</div>

<style>
    .suggestions {
        max-height: 8rem;
        overflow-y: scroll;
    }
</style>
