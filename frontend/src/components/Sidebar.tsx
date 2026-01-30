import React from 'react';

export type ViewType = 'log' | 'regex' | 'json' | 'gifer' | 'settings';

interface Props {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
}

const Sidebar: React.FC<Props> = ({ currentView, onViewChange }) => {
    return (
        <div className="w-[70px] bg-[#0d1117] border-r border-gray-800 flex flex-col items-center py-6 space-y-8 z-50">
            <button 
                onClick={() => onViewChange('log')}
                className={`flex flex-col items-center group transition-all ${currentView === 'log' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
                title="日志分析"
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-all ${currentView === 'log' ? 'bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-gray-800/50 group-hover:bg-gray-700'}`}>
                    <span className="text-2xl">📜</span>
                </div>
                <span className="text-[10px] font-bold">日志分析</span>
            </button>

            <button 
                onClick={() => onViewChange('regex')}
                className={`flex flex-col items-center group transition-all ${currentView === 'regex' ? 'text-green-500' : 'text-gray-500 hover:text-gray-300'}`}
                title="正则替换"
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-all ${currentView === 'regex' ? 'bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-gray-800/50 group-hover:bg-gray-700'}`}>
                    <span className="text-2xl">🔄</span>
                </div>
                <span className="text-[10px] font-bold">正则替换</span>
            </button>

            <button 
                onClick={() => onViewChange('json')}
                className={`flex flex-col items-center group transition-all ${currentView === 'json' ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
                title="JSON格式化"
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-all ${currentView === 'json' ? 'bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-gray-800/50 group-hover:bg-gray-700'}`}>
                    <span className="text-2xl">{"{}"}</span>
                </div>
                <span className="text-[10px] font-bold">JSON格式化</span>
            </button>

            <button 
                onClick={() => onViewChange('gifer')}
                className={`flex flex-col items-center group transition-all ${currentView === 'gifer' ? 'text-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                title="视频转GIF"
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-all ${currentView === 'gifer' ? 'bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-gray-800/50 group-hover:bg-gray-700'}`}>
                    <span className="text-2xl">🎬</span>
                </div>
                <span className="text-[10px] font-bold">视频转GIF</span>
            </button>

            <button 
                onClick={() => onViewChange('settings')}
                className={`flex flex-col items-center group transition-all ${currentView === 'settings' ? 'text-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
                title="系统设置"
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-all ${currentView === 'settings' ? 'bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-gray-800/50 group-hover:bg-gray-700'}`}>
                    <span className="text-2xl">⚙️</span>
                </div>
                <span className="text-[10px] font-bold">设置</span>
            </button>

            <div className="mt-auto flex flex-col items-center space-y-4 opacity-50">
                <span className="text-xs font-mono">v1.0.0</span>
            </div>
        </div>
    );
};

export default Sidebar;
