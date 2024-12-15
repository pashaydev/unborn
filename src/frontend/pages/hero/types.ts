export type HistoryRecord = {
    query: string;
    type: string;
    timestamp: number;
};

export type Pagination = {
    cur: number;
    maxPerPage: number;
    total: number;
};
