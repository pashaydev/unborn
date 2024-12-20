<!-- svelte-ignore event_directive_deprecated -->
<!-- svelte-ignore a11y_no_static_element_interactions -->

<script lang="ts">
    import Fuse from "fuse.js";
    import Button from "../../components/ui/button.svelte";
    import Input from "../../components/ui/input.svelte";
    import type { HistoryRecord, Pagination } from "./types";

    type $$props = {
        history: HistoryRecord[];
        handleClickToHistory: (record: any) => void;
        pagination: Pagination;
        setPagination: (value: Pagination) => void;
        disabled: boolean;
    };

    let {
        history,
        handleClickToHistory,
        pagination,
        setPagination,
        disabled = false,
    }: $$props = $props();

    let hovered = $state(false);
    let inputValue = $state("");
    let filteredData: HistoryRecord[] = $state([]);
    let paginatedData: HistoryRecord[] = $state([]);
    let totalItems = $state(0);

    let fuse: Fuse<HistoryRecord> = $state();

    $effect(() => {
        fuse = new Fuse(history, {
            keys: ["query", "type"],
            threshold: 0.4,
            includeMatches: true,
        });
    });

    function onDataChange(inputValue: string) {
        filteredData = !inputValue ? history : fuse.search(inputValue).map(result => result.item);
        console.log(filteredData, inputValue);
        totalItems = filteredData.length;

        const start = pagination.cur * pagination.maxPerPage;
        const end = start + pagination.maxPerPage;
        paginatedData = filteredData.slice(start, end);
    }

    function handleSearch(e: Event) {
        inputValue = (e.target as HTMLInputElement).value;
        setPagination({
            ...pagination,
            cur: 0,
        });
    }

    function highlightText(text: string, highlight: string) {
        if (!highlight.trim()) return text;

        const regex = new RegExp(`(${highlight})`, "gi");
        const parts = text.split(regex);

        return parts
            .map((part, i) => {
                if (regex.test(part)) {
                    return `<span class="bg-blue-500 text-white">${part}</span>`;
                }
                return part;
            })
            .join("");
    }

    let debounceTimeout;

    function debounce(func, wait) {
        return function (...args) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const debouncedOnDataChange = debounce(onDataChange, 300);

    $effect(() => {
        debouncedOnDataChange(inputValue);
    });
</script>

{#if history.length > 0}
    <div
        class="mt-6 bg-black p-2 relative"
        style="pointer-events: {disabled ? 'none' : 'all'}; cursor: {disabled ? 'wait' : ''}"
    >
        <div on:mouseenter={() => (hovered = true)} on:mouseleave={() => (hovered = false)}>
            {#if !hovered && inputValue.trim().length === 0}
                <h2 class="text-lg mb-1 mt-2">Search History</h2>
            {/if}

            {#if hovered || inputValue.trim().length > 0}
                <div>
                    <Input
                        autofocus
                        value={inputValue}
                        class="w-[10rem] h-10 px-2"
                        oninput={handleSearch}
                        placeholder="Search history..."
                    />
                </div>
            {/if}
        </div>

        <table class="w-full">
            <caption>A list of your recent searches.</caption>
            <thead>
                <tr>
                    <th class="">Query</th>
                    <th>Created at</th>
                    <th>Type</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {#each paginatedData as record (record.timestamp)}
                    <tr>
                        <td class="font-medium w-full">
                            {@html highlightText(record.query, inputValue)}
                        </td>
                        <td class="whitespace-nowrap max-sm:whitespace-normal">
                            {new Date(record.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </td>
                        <td>
                            {@html highlightText(record.type, inputValue)}
                        </td>
                        <td>
                            <Button
                                onclick={() => handleClickToHistory(record)}
                                size="sm"
                                variant="outline"
                            >
                                Restore
                            </Button>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>

        {#if Math.round(totalItems / pagination.maxPerPage)}
            <div class="space-x-2 flex justify-end align-middle my-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.cur <= 0}
                    onclick={() => {
                        setPagination({
                            ...pagination,
                            cur: pagination.cur - 1,
                        });
                        onDataChange(inputValue);
                    }}
                >
                    Previous
                </Button>

                <span class="bold block ring-slate-500 p-1">
                    {pagination.cur + 1}/{Math.ceil(totalItems / pagination.maxPerPage) || 1}
                </span>

                <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.cur >= Math.ceil(totalItems / pagination.maxPerPage) - 1}
                    onclick={() => {
                        setPagination({
                            ...pagination,
                            cur: pagination.cur + 1,
                        });
                        onDataChange(inputValue);
                    }}
                >
                    Next
                </Button>
            </div>
        {/if}
    </div>
{/if}

<style>
    table {
        width: 100%;
    }

    th,
    td {
        padding: 0.5rem;
        text-align: left;
    }
</style>
