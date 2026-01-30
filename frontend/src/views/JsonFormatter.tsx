import React, { useState, useEffect, useCallback, useRef } from 'react';

const BRACKET_COLORS = [
    'text-yellow-400',
    'text-purple-400',
    'text-blue-400',
    'text-orange-400',
    'text-green-400'
];

interface JsonNodeProps {
    data: any;
    name?: string;
    depth: number;
    isLast: boolean;
    collapsedPaths: Set<string>;
    onToggle: (path: string) => void;
    path: string;
    commentMap: Map<string, string>;
}

const JsonNode: React.FC<JsonNodeProps> = ({ data, name, depth, isLast, collapsedPaths, onToggle, path, commentMap }) => {
    const isCollapsed = collapsedPaths.has(path);
    const indent = "    ".repeat(depth);
    const bracketColor = BRACKET_COLORS[depth % BRACKET_COLORS.length];
    const comment = commentMap.get(path);

    const renderComment = () => comment ? (
        <span className="text-gray-500 italic ml-4 opacity-60 text-[11px] font-normal">{comment}</span>
    ) : null;

    if (data === null) {
        return (
            <div className="min-h-[1.5em] whitespace-pre flex items-center">
                <span>{indent}{name && <span className="text-red-400">"{name}": </span>}
                <span className="text-blue-400 italic">null</span>{!isLast && ","}</span>
                {renderComment()}
            </div>
        );
    }

    if (typeof data === 'boolean') {
        return (
            <div className="min-h-[1.5em] whitespace-pre flex items-center">
                <span>{indent}{name && <span className="text-red-400">"{name}": </span>}
                <span className="text-blue-400 italic">{data.toString()}</span>{!isLast && ","}</span>
                {renderComment()}
            </div>
        );
    }

    if (typeof data === 'number') {
        return (
            <div className="min-h-[1.5em] whitespace-pre flex items-center">
                <span>{indent}{name && <span className="text-red-400">"{name}": </span>}
                <span className="text-orange-400">{data}</span>{!isLast && ","}</span>
                {renderComment()}
            </div>
        );
    }

    if (typeof data === 'string') {
        return (
            <div className="min-h-[1.5em] whitespace-pre flex items-center">
                <span>{indent}{name && <span className="text-red-400">"{name}": </span>}
                <span className="text-green-400">"{data}"</span>{!isLast && ","}</span>
                {renderComment()}
            </div>
        );
    }

    const isArray = Array.isArray(data);
    const openBracket = isArray ? "[" : "{";
    const closeBracket = isArray ? "]" : "}";
    const keys = isArray ? data : Object.keys(data);
    const isEmpty = isArray ? data.length === 0 : keys.length === 0;

    if (isEmpty) {
        return (
            <div className="min-h-[1.5em] whitespace-pre flex items-center">
                <span>{indent}{name && <span className="text-red-400">"{name}": </span>}
                <span className={bracketColor}>{openBracket}{closeBracket}</span>{!isLast && ","}</span>
                {renderComment()}
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="min-h-[1.5em] whitespace-pre flex items-center">
                <button 
                    onClick={() => onToggle(path)}
                    className="absolute left-[-20px] w-4 h-4 flex items-center justify-center text-[10px] text-gray-500 hover:text-white transition-colors select-none"
                    style={{ marginLeft: `${depth * 2}rem` }}
                >
                    {isCollapsed ? "▶" : "▼"}
                </button>
                <span>{indent}{name && <span className="text-red-400">"{name}": </span>}
                <span className={bracketColor}>{openBracket}</span></span>
                {isCollapsed && (
                    <span 
                        className="text-gray-500 cursor-pointer hover:text-gray-300"
                        onClick={() => onToggle(path)}
                    >
                        ...{closeBracket}{!isLast && ","}
                    </span>
                )}
                {renderComment()}
            </div>
            {!isCollapsed && (
                <>
                    {isArray ? (
                        data.map((item, i) => (
                            <JsonNode 
                                key={i}
                                data={item}
                                depth={depth + 1}
                                isLast={i === data.length - 1}
                                collapsedPaths={collapsedPaths}
                                onToggle={onToggle}
                                path={`${path}.${i}`}
                                commentMap={commentMap}
                            />
                        ))
                    ) : (
                        Object.entries(data).map(([key, value], i, arr) => (
                            <JsonNode 
                                key={key}
                                name={key}
                                data={value}
                                depth={depth + 1}
                                isLast={i === arr.length - 1}
                                collapsedPaths={collapsedPaths}
                                onToggle={onToggle}
                                path={`${path}.${key}`}
                                commentMap={commentMap}
                            />
                        ))
                    )}
                    <div className="min-h-[1.5em] whitespace-pre">
                        {indent}<span className={bracketColor}>{closeBracket}</span>{!isLast && ","}
                    </div>
                </>
            )}
        </div>
    );
};

const JsonFormatter: React.FC = () => {
    const [inputText, setInputText] = useState("");
    const [jsonObject, setJsonObject] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
    const [commentMap, setCommentMap] = useState<Map<string, string>>(new Map());
    const [isInputStructured, setIsInputStructured] = useState(false);
    const [splitWidth, setSplitWidth] = useState(50); // percentage
    const [isResizing, setIsResizing] = useState(false);
    
    const outputRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const formattedTextWithCommentsRef = useRef("");
    const isPastingRef = useRef(false);

    const togglePath = useCallback((path: string) => {
        setCollapsedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    const expandAll = () => {
        setCollapsedPaths(new Set());
    };

    const collapseAll = () => {
        const allPaths = new Set<string>();
        const traverse = (data: any, path: string) => {
            if (data && typeof data === 'object') {
                allPaths.add(path);
                if (Array.isArray(data)) {
                    data.forEach((item, i) => traverse(item, `${path}.${i}`));
                } else {
                    Object.entries(data).forEach(([key, value]) => traverse(value, `${path}.${key}`));
                }
            }
        };
        if (jsonObject) {
            traverse(jsonObject, "root");
        }
        setCollapsedPaths(allPaths);
    };

    const formatJson = useCallback((text: string) => {
        if (!text.trim()) {
            setJsonObject(null);
            setError(null);
            setCommentMap(new Map());
            formattedTextWithCommentsRef.current = "";
            return;
        }

        try {
            // 1. 预处理
            let lines = text.split('\n');
            let rawCommentMap = new Map<number, string>();
            
            const cleanLines = lines.map((line, idx) => {
                let inString = false;
                let quoteChar = '';
                let commentStart = -1;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if ((char === '"' || char === "'" || char === "`") && (i === 0 || line[i-1] !== '\\')) {
                        if (!inString) {
                            inString = true;
                            quoteChar = char;
                        } else if (char === quoteChar) {
                            inString = false;
                        }
                    }
                    if (!inString && char === '/' && line[i+1] === '/') {
                        commentStart = i;
                        break;
                    }
                }
                if (commentStart !== -1) {
                    rawCommentMap.set(idx, line.substring(commentStart));
                    return line.substring(0, commentStart);
                }
                return line;
            });

            let processed = cleanLines.join('\n').trim();
            processed = processed.replace(/(^|[:[,])\s*`([^`]*)`/g, '$1"$2"');
            processed = processed.replace(/`([^`]*)`\s*([:\]},]|$)/g, '"$1"$2');
            processed = processed.replace(/(^|[:[,])\s*'([^']*)'/g, '$1"$2"');
            processed = processed.replace(/'([^']*)'\s*([:\]},]|$)/g, '"$1"$2');
            processed = processed.replace(/([{,])\s*([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
            processed = processed.replace(/,\s*([\]}])/g, '$1');

            const obj = JSON.parse(processed);
            
            // 2. 映射注释到路径
            const newCommentMap = new Map<string, string>();
            const buildCommentMap = (data: any, path: string) => {
                // 这是一个启发式匹配，基于 key
                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => {
                        const currentPath = `${path}.${key}`;
                        // 在原始行中寻找包含 key 的注释
                        for (const [idx, comment] of rawCommentMap.entries()) {
                            const origLine = lines[idx];
                            if (origLine.includes(`"${key}"`) || origLine.includes(`'${key}'`)) {
                                newCommentMap.set(currentPath, comment);
                                rawCommentMap.delete(idx);
                                break;
                            }
                        }
                        buildCommentMap(value, currentPath);
                    });
                }
            };
            buildCommentMap(obj, "root");

            setJsonObject(obj);
            setCommentMap(newCommentMap);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            setJsonObject(null);
            setCommentMap(new Map());
        }
    }, []);

    // 拖拽逻辑
    const startResizing = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            if (newWidth > 10 && newWidth < 90) {
                setSplitWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setInputText(newValue);
        
        // 如果不是正在粘贴，则自动格式化
        if (!isPastingRef.current) {
            formatJson(newValue);
        }
        isPastingRef.current = false;
    };

    const handlePaste = () => {
        isPastingRef.current = true;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Command+A (Mac) or Ctrl+A (Windows)
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
            e.preventDefault();
            const range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    };

    const copyToClipboard = (withComments: boolean) => {
        try {
            if (!withComments) {
                navigator.clipboard.writeText(JSON.stringify(jsonObject, null, 4));
            } else {
                // 带注释的文本提取在重构后需要重新考虑，暂时提供格式化后的纯 JSON
                navigator.clipboard.writeText(JSON.stringify(jsonObject, null, 4));
            }
            alert("已复制到剪贴板");
        } catch (e) {
            alert("复制失败");
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#1b2636] text-white overflow-hidden">
            <header className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#1e2a3d]">
                <h1 className="text-xl font-bold text-yellow-400">JSON 格式化 & 美化</h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => copyToClipboard(false)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
                    >
                        复制纯 JSON
                    </button>
                    <button 
                        onClick={() => copyToClipboard(true)}
                        className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded transition-colors"
                    >
                        复制带注释 JSON
                    </button>
                </div>
            </header>

            <main ref={containerRef} className="flex-1 flex overflow-hidden relative">
                <div 
                    className="flex flex-col border-r border-gray-700"
                    style={{ width: `${splitWidth}%` }}
                >
                    <div className="p-2 bg-[#1e2a3d] text-[10px] text-gray-400 border-b border-gray-700 uppercase font-bold flex justify-between items-center">
                        <span>输入文本 (支持单引号/注释)</span>
                        <div className="flex space-x-2">
                            {inputText && !jsonObject && !error && (
                                <button 
                                    onClick={() => formatJson(inputText)}
                                    className="px-2 py-0.5 rounded text-[9px] bg-green-600 text-white hover:bg-green-500 transition-colors"
                                >
                                    立即格式化
                                </button>
                            )}
                            {jsonObject && (
                                <button 
                                    onClick={() => setIsInputStructured(!isInputStructured)}
                                    className={`px-2 py-0.5 rounded text-[9px] transition-colors ${isInputStructured ? 'bg-yellow-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                                >
                                    {isInputStructured ? "切换到文本模式" : "切换到结构化模式"}
                                </button>
                            )}
                        </div>
                    </div>
                    {isInputStructured && jsonObject ? (
                        <div 
                            onKeyDown={handleKeyDown}
                            tabIndex={0}
                            className="flex-1 bg-[#1b2636] p-4 overflow-auto font-mono text-sm custom-scrollbar relative pl-6 outline-none"
                        >
                            <JsonNode 
                                data={jsonObject} 
                                depth={0} 
                                isLast={true} 
                                collapsedPaths={collapsedPaths} 
                                onToggle={togglePath} 
                                path="root"
                                commentMap={commentMap}
                            />
                        </div>
                    ) : (
                        <textarea 
                            value={inputText}
                            onChange={handleTextChange}
                            onPaste={handlePaste}
                            className="flex-1 bg-[#1b2636] p-4 outline-none resize-none font-mono text-sm"
                            placeholder="在此粘贴 JSON 文本..."
                        />
                    )}
                </div>

                {/* Resizer */}
                <div 
                    className={`w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-10 ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
                    onMouseDown={startResizing}
                />

                <div 
                    className="flex flex-col"
                    style={{ width: `${100 - splitWidth}%` }}
                >
                    <div className="p-2 bg-[#1e2a3d] text-[10px] text-gray-400 border-b border-gray-700 uppercase font-bold flex justify-between items-center">
                        <span>格式化结果 (支持全选与折叠)</span>
                        <div className="flex space-x-2">
                            <button onClick={expandAll} className="hover:text-white transition-colors">全部展开</button>
                            <button onClick={collapseAll} className="hover:text-white transition-colors">全部收起</button>
                        </div>
                    </div>
                    <div 
                        ref={outputRef}
                        onKeyDown={handleKeyDown}
                        tabIndex={0}
                        className="flex-1 bg-[#1b2636] p-4 overflow-auto font-mono text-sm custom-scrollbar outline-none relative"
                    >
                        {error ? (
                            <div className="text-red-400 p-2 bg-red-900/20 rounded border border-red-900/50">
                                {error}
                            </div>
                        ) : jsonObject ? (
                            <div className="pl-6">
                                <JsonNode 
                                    data={jsonObject} 
                                    depth={0} 
                                    isLast={true} 
                                    collapsedPaths={collapsedPaths} 
                                    onToggle={togglePath} 
                                    path="root"
                                    commentMap={commentMap}
                                />
                            </div>
                        ) : (
                            <div className="text-gray-600 italic">等待输入...</div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default JsonFormatter;
