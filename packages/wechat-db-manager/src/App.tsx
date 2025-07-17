import {useEffect, useState} from 'react';
import {Navigation, NavigationTab} from './components/Navigation';
import {SettingsPage} from './pages/SettingsPage';
import {OverviewPage} from './pages/OverviewPage';
import {DatabasePage} from './pages/DatabasePage';
import {ChatPage} from './pages/ChatPageOptimized';
import {ContactsPage} from './pages/ContactsPage';
import {AutoConnectIndicator} from './components/AutoConnectIndicator';
import {useAtom} from 'jotai';
import {initializePersistedStateAtom} from './store/atoms';
import {useAutoConnect} from './hooks/useAutoConnect';
import {useTableMapping} from './hooks/useTableMapping';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState<NavigationTab>('settings');
    const [, initializeState] = useAtom(initializePersistedStateAtom);
    const autoConnect = useAutoConnect();
    const tableMapping = useTableMapping();

    // 初始化持久化状态
    useEffect(() => {
        initializeState();
    }, [initializeState]);

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'chat':
                return <ChatPage/>;
            case 'contacts':
                return <ContactsPage/>;
            case 'database':
                return <DatabasePage/>;
            case 'overview':
                return <OverviewPage/>;
            case 'settings':
                return <SettingsPage/>;
            default:
                return (
                    <div className="flex-1 flex items-center justify-center">
                        <h2 className="text-xl text-gray-600">页面加载中...</h2>
                    </div>
                );
        }
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
            {/* Auto Connect Indicator - 顶部状态条 */}
            {(autoConnect.isAutoConnecting || autoConnect.autoConnectError) && (
                <div className="flex-shrink-0">
                    <AutoConnectIndicator
                        isConnecting={autoConnect.isAutoConnecting}
                        progress={autoConnect.autoConnectProgress}
                        error={autoConnect.autoConnectError}
                        onRetry={autoConnect.triggerAutoConnect}
                        onDismiss={autoConnect.clearError}
                    />
                </div>
            )}

            {/* Table Mapping Status - 表映射状态 */}
            {tableMapping.isInitializing && (
                <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 px-4 py-2">
                    <div className="flex items-center text-blue-800 text-sm">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-2"></div>
                        正在初始化表映射服务...
                    </div>
                </div>
            )}

            {tableMapping.isInitialized && tableMapping.stats && (
                <div className="flex-shrink-0 bg-green-50 border-b border-green-200 px-4 py-2">
                    <div className="flex items-center justify-between text-green-800 text-sm">
                        <div className="flex items-center">
                            <div className="rounded-full h-4 w-4 bg-green-500 mr-2"></div>
                            表映射就绪 - {tableMapping.stats.totalTables} 个表，{tableMapping.stats.chatTables} 个聊天表
                        </div>
                        <div className="text-xs text-green-600">
                            {tableMapping.stats.databaseCount} 个数据库
                        </div>
                    </div>
                </div>
            )}

            {!tableMapping.isInitializing && !tableMapping.isInitialized && (
                <div className="flex-shrink-0 bg-yellow-50 border-b border-yellow-200 px-4 py-2">
                    <div className="flex items-center text-yellow-800 text-sm">
                        <div className="rounded-full h-4 w-4 bg-yellow-500 mr-2"></div>
                        等待数据库加载...请先在设置页面加载keys文件
                    </div>
                </div>
            )}

            {/* Main Content Area - 确保可以收缩并包含滚动 */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {renderActiveTab()}
            </div>

            {/* Bottom Navigation - 固定在底部，不允许收缩 */}
            <div className="flex-shrink-0">
                <Navigation
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>
        </div>
    );
}

export default App;