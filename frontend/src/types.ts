export interface Match {
    line: number;
    content: string;
    offset: number;
}

export interface SearchOptions {
    FilePath: string;
    Query: string;
    IsRegex: boolean;
    IgnoreCase: boolean;
    Invert: boolean;
    Logic: string;
    Context: number;
    MaxResults: number;
}
