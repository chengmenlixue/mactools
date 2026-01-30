import React, { useState, useEffect } from 'react';
import * as runtime from '../../wailsjs/runtime';
import { ConvertVideoToGif, CheckFFmpeg, SelectVideoFile, SelectSaveGifPath, GetFileBase64 } from '../../wailsjs/go/main/App';

const Gifer: React.FC = () => {
    const [inputPath, setInputPath] = useState('');
    const [outputPath, setOutputPath] = useState('');
    const [fps, setFps] = useState(30);
    const [loop, setLoop] = useState(true);
    const [width, setWidth] = useState(480);
    const [quality, setQuality] = useState(80);
    const [progress, setProgress] = useState(0);
    const [isConverting, setIsConverting] = useState(false);
    const [hasFFmpeg, setHasFFmpeg] = useState<boolean | null>(null);
    const [status, setStatus] = useState('');
    const [previewData, setPreviewData] = useState('');

    useEffect(() => {
        CheckFFmpeg().then(setHasFFmpeg);

        const progressUnsubscribe = runtime.EventsOn('gifer_progress', (p: number) => {
            setProgress(Math.round(p));
        });

        const errorUnsubscribe = runtime.EventsOn('gifer_error', (err: string) => {
            setIsConverting(false);
            setStatus(`错误: ${err}`);
        });

        const completeUnsubscribe = runtime.EventsOn('gifer_complete', (path: string) => {
            setIsConverting(false);
            setProgress(100);
            setOutputPath(path);
            setStatus('转换成功！');
        });

        return () => {
            progressUnsubscribe();
            errorUnsubscribe();
            completeUnsubscribe();
        };
    }, []);

    const handleSelectFile = async () => {
        try {
            const file = await SelectVideoFile();
            if (file) {
                setInputPath(file);
                setStatus('');
                setProgress(0);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleConvert = async () => {
        if (!inputPath) return;

        try {
            const fileName = inputPath.split(/[\\/]/).pop()?.split('.')[0] || 'output';
            const savePath = await SelectSaveGifPath(`${fileName}.gif`);
            
            if (savePath) {
                setIsConverting(true);
                setProgress(0);
                setPreviewData('');
                setStatus('正在转换中...');
                
                await ConvertVideoToGif({
                    inputPath,
                    outputPath: savePath,
                    fps: Number(fps),
                    loop,
                    width: Number(width),
                    quality: Number(quality)
                });

                // Load preview
                const base64 = await GetFileBase64(savePath);
                setPreviewData(`data:image/gif;base64,${base64}`);
            }
        } catch (err) {
            console.error(err);
            setIsConverting(false);
            setStatus('转换失败');
        }
    };

    if (hasFFmpeg === false) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-[#0d1117] text-white p-8">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold mb-2">未检测到 FFmpeg</h2>
                <p className="text-gray-400 text-center max-w-md mb-6">
                    视频转 GIF 功能依赖于 FFmpeg。请先安装 FFmpeg 并将其添加到系统环境变量（PATH）中。
                </p>
                <div className="bg-gray-800 p-4 rounded-lg text-sm font-mono text-blue-300">
                    brew install ffmpeg
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#0d1117] text-white overflow-hidden">
            <header className="p-6 border-b border-gray-800 bg-[#161b22]">
                <h1 className="text-2xl font-bold flex items-center">
                    <span className="mr-3">🎬</span> Gifer - 视频转 GIF
                </h1>
                <p className="text-gray-400 text-sm mt-1">高性能、高画质的视频转 GIF 工具</p>
            </header>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-8">
                    {/* 文件选择区 */}
                    <div className="bg-[#161b22] border-2 border-dashed border-gray-700 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors">
                        {inputPath ? (
                            <div className="space-y-4">
                                <div className="text-4xl">📄</div>
                                <div className="font-medium text-blue-400 break-all">{inputPath}</div>
                                <button 
                                    onClick={handleSelectFile}
                                    className="text-xs text-gray-400 hover:text-white underline"
                                >
                                    重新选择视频
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-6xl text-gray-600">📥</div>
                                <div className="text-lg text-gray-300">选择或拖拽视频文件到这里</div>
                                <button 
                                    onClick={handleSelectFile}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition-all transform active:scale-95"
                                >
                                    选择视频
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 参数设置 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800">
                            <label className="block text-sm font-bold text-gray-400 uppercase mb-4">帧率 (FPS)</label>
                            <div className="flex items-center space-x-4">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="60" 
                                    value={fps}
                                    onChange={(e) => setFps(Number(e.target.value))}
                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="w-12 text-center font-mono bg-gray-800 py-1 rounded border border-gray-700">{fps}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">推荐: 15-30 FPS。更高的帧率意味着更大的文件体积。</p>
                        </div>

                        <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800">
                            <label className="block text-sm font-bold text-gray-400 uppercase mb-4">目标宽度 (px)</label>
                            <div className="flex items-center space-x-4">
                                <input 
                                    type="number" 
                                    value={width}
                                    onChange={(e) => setWidth(Number(e.target.value))}
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 outline-none focus:border-blue-500 font-mono"
                                />
                                <span className="text-gray-500 text-xs">高度自动比例</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">设置为 0 则保持原视频宽度。</p>
                        </div>

                        <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800 flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-bold text-gray-400 uppercase">无限循环</label>
                                <p className="text-[10px] text-gray-500 mt-1">生成的 GIF 是否无限循环播放</p>
                            </div>
                            <button 
                                onClick={() => setLoop(!loop)}
                                className={`w-12 h-6 rounded-full relative transition-colors ${loop ? 'bg-blue-600' : 'bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${loop ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800">
                            <label className="block text-sm font-bold text-gray-400 uppercase mb-4">压缩质量 (Quality)</label>
                            <div className="flex items-center space-x-4">
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="100" 
                                    value={quality}
                                    onChange={(e) => setQuality(Number(e.target.value))}
                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="w-12 text-center font-mono bg-gray-800 py-1 rounded border border-gray-700">{quality}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">推荐: 70-90。较低的质量会显著减小体积并使用更快的算法。</p>
                        </div>

                        <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800 flex flex-col justify-center">
                            <button 
                                onClick={handleConvert}
                                disabled={!inputPath || isConverting}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2 ${
                                    !inputPath || isConverting 
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20'
                                }`}
                            >
                                {isConverting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>正在转换...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>⚡ 开始转换</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* 进度条和状态 */}
                    {(isConverting || progress > 0 || status) && (
                        <div className="bg-[#161b22] p-8 rounded-2xl border border-gray-800 space-y-4">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="font-medium text-gray-300">{status || (isConverting ? '转换进度' : '就绪')}</span>
                                <span className="font-mono text-blue-400">{progress}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            {outputPath && !isConverting && (
                                <div className="mt-4 p-4 bg-green-900/20 border border-green-900/50 rounded-lg flex flex-col space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-green-400">✅ 文件已保存: {outputPath}</span>
                                    </div>
                                    {previewData && (
                                        <div className="mt-2 text-center">
                                            <p className="text-xs text-gray-500 mb-2 uppercase font-bold">结果预览</p>
                                            <div className="inline-block p-2 bg-[#0d1117] rounded-xl border border-gray-700 shadow-2xl">
                                                <img 
                                                    src={previewData} 
                                                    alt="GIF Preview" 
                                                    className="max-w-full h-auto rounded-lg"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Gifer;
