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
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState<NavigationTab>('settings');
    const [, initializeState] = useAtom(initializePersistedStateAtom);
    const autoConnect = useAutoConnect();

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