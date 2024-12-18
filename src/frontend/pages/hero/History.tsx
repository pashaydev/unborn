import Fuse from "fuse.js";
import React, { useEffect, useState } from "react";
import { useMemo } from "react";

import { Button } from "../../components/ui/button";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { HistoryRecord, Pagination } from "./types";

// Highlight component for matching text
const Highlight = ({ text, highlight }: { text: string; highlight: string }) => {
    if (!highlight.trim()) {
        return <span>{text}</span>;
    }

    const regex = new RegExp(`(${highlight})`, "gi");
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} className="bg-blue-500 text-white">
                        {part}
                    </span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};

// Modified TableDemo component
const TableDemo = ({
    data,
    handleClickToHistory,
    pagination,
    searchTerm,
}: {
    data: HistoryRecord[];
    handleClickToHistory: (r: any) => void;
    pagination: Pagination;
    searchTerm: string;
}) => {
    const fuse = useMemo(
        () =>
            new Fuse(data, {
                keys: ["query", "type"],
                threshold: 0.4,
                includeMatches: true,
            }),
        [data]
    );

    const filteredData = useMemo(() => {
        if (!searchTerm) return data;
        return fuse.search(searchTerm).map(result => result.item);
    }, [fuse, searchTerm, data]);

    const paginatedData = filteredData.slice(
        pagination.cur * pagination.maxPerPage,
        (pagination.cur + 1) * pagination.maxPerPage
    );

    return (
        <Table>
            <TableCaption>A list of your recent searches.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="">Query</TableHead>
                    <TableHead>Created at</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedData.map(record => (
                    <TableRow key={record.timestamp}>
                        <TableCell className="font-medium w-full">
                            <Highlight text={record.query} highlight={searchTerm} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap max-sm:whitespace-normal">
                            {new Date(record.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </TableCell>
                        <TableCell>
                            <Highlight text={record.type} highlight={searchTerm} />
                        </TableCell>
                        <TableCell>
                            <Button
                                onClick={() => handleClickToHistory(record)}
                                size="sm"
                                variant="outline">
                                Restore
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

type HistoryProps = {
    history: HistoryRecord[];
    handleClickToHistory: (r: any) => void;
    pagination: Pagination;
    setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
    disabled: boolean;
};

// Modified History component
const History = ({
    history,
    setPagination,
    pagination,
    handleClickToHistory,
    disabled,
}: HistoryProps) => {
    const [hovered, setHovered] = useState(false);
    const [inputValue, setInputValue] = useState("");

    // Update pagination when search results change
    useEffect(() => {
        setPagination(p => ({
            ...p,
            cur: 0,
            total: history.length,
        }));
    }, [inputValue, history.length, setPagination]);

    return (
        <>
            {history.length > 0 && (
                <div
                    className="mt-6 bg-black p-2 relative"
                    style={{
                        pointerEvents: disabled ? "none" : "all",
                        cursor: disabled ? "wait" : "",
                    }}>
                    <div
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}>
                        {!hovered && inputValue.trim().length === 0 && (
                            <h2 className="text-lg mb-1 mt-2">Search History</h2>
                        )}
                        {(hovered || inputValue.trim().length > 0) && (
                            <div>
                                <Input
                                    autoFocus
                                    value={inputValue}
                                    className="w-[10rem] h-10"
                                    onChange={e => setInputValue(e.target.value)}
                                    placeholder="Search history..."
                                />
                            </div>
                        )}
                    </div>

                    <TableDemo
                        pagination={pagination}
                        handleClickToHistory={handleClickToHistory}
                        data={history}
                        searchTerm={inputValue}
                    />

                    {Boolean(Math.round(pagination.total / pagination.maxPerPage)) && (
                        <div className="space-x-2 flex justify-end align-middle my-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.cur <= 0}
                                onClick={() => {
                                    setPagination(p => ({
                                        ...p,
                                        cur: p.cur > 0 ? p.cur - 1 : p.cur,
                                    }));
                                }}>
                                Previous
                            </Button>

                            <span className="bold block ring-slate-500 p-1">
                                {pagination.cur + 1}/
                                {Math.round(pagination.total / pagination.maxPerPage) || 1}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    pagination.cur >=
                                    Math.ceil(pagination.total / pagination.maxPerPage) - 1
                                }
                                onClick={() => {
                                    setPagination(p => ({
                                        ...p,
                                        cur:
                                            p.cur >
                                            Math.round(pagination.total / pagination.maxPerPage)
                                                ? p.cur
                                                : p.cur + 1,
                                    }));
                                }}>
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default History;
