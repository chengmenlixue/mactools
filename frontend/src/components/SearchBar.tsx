import React, { useState } from 'react';
import * as AppBackend from "../../wailsjs/go/main/App";

interface Props {
    onSearch: (query: string, options: any) => void;
    onCancel: () => void;
    searching: boolean;
    setFilePath: (path: string) => void;
}

const SearchBar: React.FC<Props> = ({ onSearch, onCancel, searching, setFilePath }) => {
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState({
        isRegex: false,
        ignoreCase: true,
        invert: false,
        logic: "AND",
        contextLines: "0"
    });

    const handleFileSelect = async () => {
        try {
            if (AppBackend.SelectFile) {
                const path = await AppBackend.SelectFile();
                if (path) {
                    setFilePath(path);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query, options);
        }
    };

    return (
        <div className="p-4 bg-[#25334a] shadow-lg">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
                <div className="flex space-x-2">
                    <button 
                        type="button"
                        onClick={handleFileSelect}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors whitespace-nowrap"
                    >
                        Select File
                    </button>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search logs (grep logic)..."
                        className="flex-1 px-4 py-2 bg-[#1b2636] border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-sm"
                    />
                    {searching ? (
                        <button 
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                        >
                            Stop
                        </button>
                    ) : (
                        <button 
                            type="submit"
                            disabled={!query.trim()}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
                        >
                            Search
                        </button>
                    )}
                </div>

                <div className="flex items-center space-x-6 text-xs text-gray-300 ml-1">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={options.isRegex} 
                            onChange={e => setOptions({...options, isRegex: e.target.checked})}
                            className="rounded bg-gray-700 border-gray-600 text-blue-500"
                        />
                        <span>Regex (-E)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={options.ignoreCase} 
                            onChange={e => setOptions({...options, ignoreCase: e.target.checked})}
                            className="rounded bg-gray-700 border-gray-600 text-blue-500"
                        />
                        <span>Ignore Case (-i)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={options.invert} 
                            onChange={e => setOptions({...options, invert: e.target.checked})}
                            className="rounded bg-gray-700 border-gray-600 text-blue-500"
                        />
                        <span>Invert Match (-v)</span>
                    </label>
                    
                    <div className="flex items-center space-x-2 bg-[#1b2636] rounded p-1 border border-gray-600">
                        <button
                            type="button"
                            onClick={() => setOptions({...options, logic: "AND"})}
                            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${options.logic === "AND" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                        >
                            AND
                        </button>
                        <button
                            type="button"
                            onClick={() => setOptions({...options, logic: "OR"})}
                            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${options.logic === "OR" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                        >
                            OR
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span>Context Lines:</span>
                        <input 
                            type="number" 
                            min="0"
                            max="50"
                            value={options.contextLines} 
                            onChange={e => setOptions({...options, contextLines: e.target.value})}
                            className="w-16 px-2 py-1 bg-[#1b2636] border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-xs"
                        />
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SearchBar;
