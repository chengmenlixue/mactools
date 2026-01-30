import React, { useState, useEffect } from 'react';
import * as runtime from "../../wailsjs/runtime/runtime";
import * as AppBackend from "../../wailsjs/go/main/App";
import SearchBar from '../components/SearchBar';
import ResultList from '../components/ResultList';
import { Match } from '../types';

const LogAnalysis: React.FC = () => {
    const [results, setResults] = useState<Match[]>([]);
    const [searching, setSearching] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ elapsed: 0, count: 0, status: "" });
    const [filePath, setFilePath] = useState("");
    const [searchParams, setSearchParams] = useState({ query: "", isRegex: false, ignoreCase: false, invert: false, logic: "AND" });

    useEffect(() => {
        // Listen for search results
        const offResults = runtime.EventsOn("search_results", (batch: Match[]) => {
            setResults(prev => [...prev, ...batch]);
            setStats(prev => ({ ...prev, count: prev.count + batch.length }));
        });

        // Listen for progress
        const offProgress = runtime.EventsOn("search_progress", (p: number) => {
            setProgress(p);
        });

        // Listen for completion
        const offComplete = runtime.EventsOn("search_complete", (data: { elapsed: number, status: string, error?: string }) => {
            setSearching(false);
            setStats(prev => ({ ...prev, elapsed: data.elapsed, status: data.status }));
            if (data.error && data.status !== "cancelled") {
                alert("Search Error: " + data.error);
            }
        });

        return () => {
            if (offResults) offResults();
            if (offProgress) offProgress();
            if (offComplete) offComplete();
        };
    }, []);

    const handleSearch = async (query: string, options: any) => {
        if (!filePath) {
            alert("Please select a file first");
            return;
        }
        setResults([]);
        setStats({ elapsed: 0, count: 0, status: "searching" });
        setSearching(true);
        setProgress(0);
        setSearchParams({ 
            query, 
            isRegex: options.isRegex as boolean, 
            ignoreCase: options.ignoreCase as boolean, 
            invert: options.invert as boolean,
            logic: options.logic as string
        });

        try {
            if (AppBackend.Search) {
                await AppBackend.Search({
                    FilePath: filePath,
                    Query: query,
                    IsRegex: options.isRegex,
                    IgnoreCase: options.ignoreCase,
                    Invert: options.invert,
                    Logic: options.logic,
                    Context: parseInt(options.contextLines) || 0,
                    MaxResults: 5000 
                });
            } else {
                throw new Error("Backend Search function not found");
            }
        } catch (err: any) {
            setSearching(false);
            alert("Search failed: " + err.message);
        }
    };

    const handleCancel = async () => {
        if (AppBackend.CancelSearch) {
            await AppBackend.CancelSearch();
        }
        setSearching(false);
    };

    return (
        <div className="h-full flex flex-col bg-[#1b2636] text-white overflow-hidden">
            <header className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#1e2a3d]">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold text-blue-400">日志分析</h1>
                    <span className="text-xs text-gray-400">{filePath || "未选择文件"}</span>
                </div>
                {searching && (
                    <div className="flex items-center space-x-2">
                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-xs">{progress.toFixed(0)}%</span>
                    </div>
                )}
            </header>

            <main className="flex-1 flex flex-col overflow-hidden">
                <SearchBar onSearch={handleSearch} onCancel={handleCancel} searching={searching} setFilePath={setFilePath} />
                
                <div className="flex-1 overflow-hidden relative">
                    <ResultList results={results} searchParams={searchParams} />
                </div>
            </main>

            <footer className="p-2 px-4 border-t border-gray-700 bg-[#1e2a3d] flex justify-between text-xs text-gray-400">
                <div>找到 {stats.count.toLocaleString()} 条结果</div>
                <div>耗时: {stats.elapsed.toFixed(3)}s</div>
            </footer>
        </div>
    );
};

export default LogAnalysis;
