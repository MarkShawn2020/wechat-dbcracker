import {useEffect} from 'react';
import {useAtom} from 'jotai';
import {initializePersistedStateAtom} from './store/atoms';
import './App.css';

function App() {
    const [, initializeState] = useAtom(initializePersistedStateAtom);

    // 初始化持久化状态
    useEffect(() => {
        initializeState();
    }, [initializeState]);

    return (
        <div className="h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">WeChat DB Manager</h1>
                <p className="text-gray-600">应用正在启动...</p>
                <div className="mt-4 p-4 bg-white rounded-lg shadow">
                    <p className="text-sm text-green-600">✅ 基础应用已成功启动</p>
                </div>
            </div>
        </div>
    );
}

export default App;