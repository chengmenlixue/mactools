import React from 'react';

const Settings: React.FC = () => {
    return (
        <div className="h-full flex flex-col bg-[#1b2636] text-white overflow-hidden">
            <header className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#1e2a3d]">
                <h1 className="text-xl font-bold text-purple-400">系统设置</h1>
            </header>

            <main className="flex-1 p-8 max-w-2xl mx-auto w-full">
                <div className="bg-[#25334a] rounded-xl p-6 shadow-xl border border-gray-700">
                    <h2 className="text-lg font-semibold mb-6 flex items-center">
                        <span className="mr-2">⌨️</span> 快捷键配置
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-[#1b2636] rounded-lg border border-gray-600">
                            <div>
                                <div className="font-medium">显示/隐藏窗口</div>
                                <div className="text-xs text-gray-400 mt-1">在任何地方快速唤起或隐藏应用</div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs border border-gray-500 shadow-sm">Command</kbd>
                                <span className="text-gray-500">+</span>
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs border border-gray-500 shadow-sm">4</kbd>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                            <div className="flex space-x-3">
                                <span className="text-blue-400">ℹ️</span>
                                <div className="text-xs text-blue-200 leading-relaxed">
                                    <p className="font-bold mb-1">macOS 权限提示：</p>
                                    如果快捷键无效，请确保在 <code className="bg-blue-900/40 px-1 rounded">系统设置 -&gt; 隐私与安全性 -&gt; 辅助功能</code> 中已允许 LogAna 控制您的电脑。
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-500 text-xs">
                    <p>LogAna v1.0.0</p>
                    <p className="mt-1">由 Wails & React 提供动力</p>
                </div>
            </main>
        </div>
    );
};

export default Settings;
