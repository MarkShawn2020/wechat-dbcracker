import {useEffect, useState} from 'react';
import {Navigation, NavigationTab} from './components/Navigation';
import {useAtom} from 'jotai';
import {initializePersistedStateAtom} from './store/atoms';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
    const [, initializeState] = useAtom(initializePersistedStateAtom);

    // 初始化持久化状态
    useEffect(() => {
        initializeState();
    }, [initializeState]);

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'chat':
                return (
                    <div
                        className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                            <h2 className="text-xl font-bold text-gray-900 mb-3">💬 聊天记录</h2>
                            <p className="text-gray-600">聊天记录功能正在开发中...</p>
                        </div>
                    </div>
                );
            case 'database':
                return (
                    <div
                        className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
                        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                            <h2 className="text-xl font-bold text-gray-900 mb-3">🗄️ 数据库</h2>
                            <p className="text-gray-600">数据库管理功能正在开发中...</p>
                        </div>
                    </div>
                );
            case 'overview':
                return (
                    <div
                        className="flex-1 flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                            <h2 className="text-xl font-bold text-gray-900 mb-3">📊 概览</h2>
                            <p className="text-gray-600">数据概览功能正在开发中...</p>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-50">
                        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                            <h2 className="text-xl font-bold text-gray-900 mb-3">⚙️ 设置</h2>
                            <p className="text-gray-600">设置功能正在开发中...</p>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="flex-1 flex items-center justify-center">
                        <h2 className="text-xl text-gray-600">页面加载中...</h2>
                    </div>
                );
        }
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
                {renderActiveTab()}
            </div>

            {/* Bottom Navigation */}
            <Navigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        </div>
    );
}

export default App;