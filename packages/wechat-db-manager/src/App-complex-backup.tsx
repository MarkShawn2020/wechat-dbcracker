import {useEffect, useState} from 'react';
import {Navigation, NavigationTab} from './components/Navigation';
import {ChatPage} from './pages/ChatPage';
import {DatabasePage} from './pages/DatabasePage';
import {OverviewPage} from './pages/OverviewPage';
import {SettingsPage} from './pages/SettingsPage';
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
                return <ChatPage/>;
            case 'database':
                return <DatabasePage/>;
            case 'overview':
                return <OverviewPage/>;
            case 'settings':
                return <SettingsPage/>;
            default:
                return <OverviewPage/>;
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