import React, { useState } from 'react';
import Sidebar, { ViewType } from './components/Sidebar';
import LogAnalysis from './views/LogAnalysis';
import RegexReplacer from './views/RegexReplacer';
import JsonFormatter from './views/JsonFormatter';
import Settings from './views/Settings';

function App() {
    const [currentView, setCurrentView] = useState<ViewType>('log');

    return (
        <div className="h-screen flex bg-[#0d1117] overflow-hidden font-sans">
            <Sidebar currentView={currentView} onViewChange={setCurrentView} />
            
            <div className="flex-1 relative">
                {currentView === 'log' && <LogAnalysis />}
                {currentView === 'regex' && <RegexReplacer />}
                {currentView === 'json' && <JsonFormatter />}
                {currentView === 'settings' && <Settings />}
            </div>
        </div>
    );
}

export default App;
