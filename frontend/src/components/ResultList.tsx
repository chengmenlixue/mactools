import React from 'react';
import { Match } from '../types';

interface Props {
    results: Match[];
    searchParams: {
        query: string;
        isRegex: boolean;
        ignoreCase: boolean;
        invert: boolean;
    };
}

const ResultList: React.FC<Props> = ({ results, searchParams }) => {
    const highlightText = (text: string) => {
        if (!searchParams.query || searchParams.invert) return text;

        try {
            const queries = searchParams.query.trim().split(/\s+/);
            if (queries.length === 0) return text;

            // Sort queries by length descending to avoid partial matches on shorter words first
            const sortedQueries = [...queries].sort((a, b) => b.length - a.length);
            
            let patterns: string[];
            if (searchParams.isRegex) {
                patterns = sortedQueries.map(q => `(${q})`);
            } else {
                patterns = sortedQueries.map(q => `(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
            }

            const masterRegex = new RegExp(patterns.join('|'), searchParams.ignoreCase ? 'gi' : 'g');

            const parts = text.split(masterRegex);
            // Master regex with capture groups will include matches in the split parts
            return parts.map((part, i) => {
                if (!part) return null;
                
                // Check if this part matches any of our query terms
                const isMatch = queries.some(q => {
                    const testRegex = new RegExp(
                        searchParams.isRegex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                        searchParams.ignoreCase ? 'i' : ''
                    );
                    return testRegex.test(part);
                });

                return isMatch ? (
                    <mark key={i} className="bg-yellow-500 text-black rounded-sm px-0.5">{part}</mark>
                ) : (
                    part
                );
            });
        } catch (e) {
            console.error("Highlight error:", e);
            return text;
        }
    };

    return (
        <div className="absolute inset-0 overflow-auto p-2 font-mono text-sm">
            {results.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 italic">
                    No results to display. Start a search to see matches.
                </div>
            ) : (
                <div className="space-y-1">
                    {results.map((match, i) => (
                        <div key={i} className="p-2 bg-[#2a374d] rounded border-l-2 border-blue-500 hover:bg-[#32415a] transition-colors group">
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>Offset: {match.offset}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Row {i + 1}</span>
                            </div>
                            <div className="break-all whitespace-pre-wrap">{highlightText(match.content)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResultList;
