import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as AppBackend from "../../wailsjs/go/main/App";
import { replacer } from "../../wailsjs/go/models";

const AutoResizingTextarea: React.FC<{
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
    className: string;
}> = ({ value, onChange, placeholder, className }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            rows={1}
            style={{ overflow: 'hidden', resize: 'none' }}
        />
    );
};

const RegexReplacer: React.FC = () => {
    const [inputText, setInputText] = useState("");
    const [outputText, setOutputText] = useState("");
    const [ruleSets, setRuleSets] = useState<replacer.RuleSet[]>([]);
    const [activeRuleSetIndex, setActiveRuleSetIndex] = useState(0);
    const [isAutoReplace, setIsAutoReplace] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Load rule sets on mount
    useEffect(() => {
        const load = async () => {
            try {
                if (AppBackend.LoadRuleSets) {
                    const sets = await AppBackend.LoadRuleSets();
                    if (sets && sets.length > 0) {
                        setRuleSets(sets.map(s => replacer.RuleSet.createFrom(s)));
                    } else {
                        // Default initial rule set
                        const defaultRule = replacer.Rule.createFrom({ 
                            name: "示例规则", 
                            pattern: "apple", 
                            replacement: "banana", 
                            active: true, 
                            dotAll: true,
                            collapsed: false 
                        });
                        const defaultSet = replacer.RuleSet.createFrom({
                            name: "默认规则集",
                            rules: [defaultRule]
                        });
                        setRuleSets([defaultSet]);
                    }
                }
            } catch (err) {
                console.error("加载规则集失败:", err);
            }
        };
        load();
    }, []);

    const handleReplace = useCallback(async () => {
        if (!inputText || !ruleSets[activeRuleSetIndex]) {
            setOutputText(inputText);
            return;
        }

        try {
            if (AppBackend.ReplaceText) {
                const result = await AppBackend.ReplaceText(inputText, ruleSets[activeRuleSetIndex].rules);
                setOutputText(result);
            }
        } catch (err: any) {
            console.error("替换失败:", err);
        }
    }, [inputText, ruleSets, activeRuleSetIndex]);

    useEffect(() => {
        if (isAutoReplace) {
            handleReplace();
        }
    }, [inputText, ruleSets, activeRuleSetIndex, isAutoReplace, handleReplace]);

    const saveAllRuleSets = async (updatedSets: replacer.RuleSet[]) => {
        setRuleSets(updatedSets);
        try {
            if (AppBackend.SaveRuleSets) {
                await AppBackend.SaveRuleSets(updatedSets);
            }
        } catch (err) {
            console.error("保存规则集失败:", err);
        }
    };

    const addRule = () => {
        const newSets = [...ruleSets];
        const currentRules = newSets[activeRuleSetIndex].rules;
        const isFirstRule = currentRules.length === 0;
        
        const newRule = replacer.Rule.createFrom({
            name: isFirstRule ? "示例规则" : "新规则",
            pattern: "",
            replacement: "",
            active: isFirstRule,
            dotAll: true,
            collapsed: !isFirstRule
        });
        newSets[activeRuleSetIndex].rules.push(newRule);
        saveAllRuleSets(newSets);
    };

    const updateRule = (ruleIndex: number, field: keyof replacer.Rule, value: any) => {
        const newSets = [...ruleSets];
        (newSets[activeRuleSetIndex].rules[ruleIndex] as any)[field] = value;
        saveAllRuleSets(newSets);
    };

    const deleteRule = (ruleIndex: number) => {
        const newSets = [...ruleSets];
        newSets[activeRuleSetIndex].rules.splice(ruleIndex, 1);
        saveAllRuleSets(newSets);
    };

    const addRuleSet = () => {
        const name = prompt("请输入新规则集名称:");
        if (name) {
            const newSet = replacer.RuleSet.createFrom({ name, rules: [] });
            const newSets = [...ruleSets, newSet];
            saveAllRuleSets(newSets);
            setActiveRuleSetIndex(newSets.length - 1);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Add a ghost image or some styling if needed
        const target = e.target as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        setDragOverIndex(null);
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            return;
        }

        const newSets = [...ruleSets];
        const rules = [...newSets[activeRuleSetIndex].rules];
        const [movedRule] = rules.splice(draggedIndex, 1);
        rules.splice(targetIndex, 0, movedRule);
        
        newSets[activeRuleSetIndex].rules = rules;
        saveAllRuleSets(newSets);
        setDraggedIndex(null);
    };

    return (
        <div className="h-full flex flex-col bg-[#1b2636] text-white overflow-hidden">
            <header className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#1e2a3d]">
                <h1 className="text-xl font-bold text-green-400">正则文本替换</h1>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={isAutoReplace} 
                            onChange={(e) => setIsAutoReplace(e.target.checked)}
                            className="rounded"
                        />
                        <span>自动替换</span>
                    </label>
                    {!isAutoReplace && (
                        <button 
                            onClick={handleReplace}
                            className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
                        >
                            执行替换
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                {/* Rules Sidebar */}
                <div className="w-80 border-r border-gray-700 flex flex-col bg-[#25334a]">
                    <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                        <span className="text-sm font-semibold">当前规则</span>
                        <button onClick={addRule} className="text-xs text-blue-400 hover:text-blue-300">+ 添加规则</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {ruleSets[activeRuleSetIndex]?.rules.map((rule, i) => (
                            <div key={i}>
                                <div 
                                    className={`bg-[#1e2a3d] rounded border border-gray-600 overflow-hidden relative group transition-all ${draggedIndex === i ? 'opacity-40 grayscale' : ''} ${dragOverIndex === i && draggedIndex !== i ? 'border-blue-500 ring-2 ring-blue-500/30' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, i)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(e, i)}
                                    onDrop={(e) => handleDrop(e, i)}
                                >
                                    {/* Rule Header */}
                                    <div className="flex items-center px-3 py-2 bg-[#2a374d] border-b border-gray-600">
                                        <div 
                                            className="mr-2 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 p-1"
                                            title="拖动排序"
                                        >
                                            ⋮⋮
                                        </div>
                                    <button 
                                        onClick={() => updateRule(i, 'collapsed', !rule.collapsed)}
                                        className="mr-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        <span className={`inline-block transform transition-transform duration-200 ${rule.collapsed ? '' : 'rotate-90'}`}>
                                            ▶
                                        </span>
                                    </button>
                                    <input 
                                        type="text"
                                        value={rule.name}
                                        onChange={(e) => updateRule(i, 'name', e.target.value)}
                                        placeholder="规则名称"
                                        className="flex-1 bg-transparent text-xs font-semibold outline-none text-blue-300 placeholder-gray-500"
                                    />
                                    <div className="flex items-center space-x-2 ml-2">
                                        <input 
                                            type="checkbox" 
                                            checked={rule.active}
                                            onChange={(e) => updateRule(i, 'active', e.target.checked)}
                                            className="rounded w-3 h-3 cursor-pointer"
                                            title="激活规则"
                                        />
                                        <button 
                                            onClick={() => deleteRule(i)}
                                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
                                            title="删除规则"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>

                                {/* Rule Content (Visible when not collapsed) */}
                                {!rule.collapsed && (
                                    <div className="p-3 space-y-3">
                                        <div>
                                            <label className="text-[10px] text-gray-400 uppercase">正则模式</label>
                                            <AutoResizingTextarea 
                                                value={rule.pattern}
                                                onChange={(e) => updateRule(i, 'pattern', e.target.value)}
                                                placeholder="Pattern (regex)"
                                                className="w-full bg-[#1b2636] text-xs border border-gray-600 rounded px-2 py-1 mt-1 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 uppercase">替换内容</label>
                                            <AutoResizingTextarea 
                                                value={rule.replacement}
                                                onChange={(e) => updateRule(i, 'replacement', e.target.value)}
                                                placeholder="Replacement"
                                                className="w-full bg-[#1b2636] text-xs border border-gray-600 rounded px-2 py-1 mt-1 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="flex items-center">
                                            <label className="flex items-center space-x-1 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={rule.dotAll}
                                                    onChange={(e) => updateRule(i, 'dotAll', e.target.checked)}
                                                    className="rounded w-3 h-3"
                                                />
                                                <span className="text-[10px] text-gray-300">匹配换行 (.)</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Text Area Split */}
                <div className="flex-1 flex">
                    <div className="flex-1 flex flex-col border-r border-gray-700">
                        <div className="p-2 bg-[#1e2a3d] text-[10px] text-gray-400 border-b border-gray-700 uppercase font-bold">原始文本</div>
                        <textarea 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="flex-1 bg-[#1b2636] p-4 outline-none resize-none font-mono text-sm"
                            placeholder="在此输入原始文本..."
                        />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="p-2 bg-[#1e2a3d] text-[10px] text-gray-400 border-b border-gray-700 uppercase font-bold">替换结果</div>
                        <textarea 
                            value={outputText}
                            readOnly
                            className="flex-1 bg-[#1b2636] p-4 outline-none resize-none font-mono text-sm text-green-300"
                            placeholder="替换后的结果将显示在此..."
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegexReplacer;
