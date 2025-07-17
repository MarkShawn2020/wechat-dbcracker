import {useEffect, useState} from 'react';
import {useAtom} from 'jotai';
import {databasesAtom} from '../store/atoms';
import {AutoConnectService} from '../services/autoConnectService';
import {DatabaseInfo} from '../types';

export interface AutoConnectState {
    isAutoConnecting: boolean;
    autoConnectProgress: {
        message: string;
        current: number;
        total: number;
    } | null;
    autoConnectError: string | null;
    connectedDatabases: DatabaseInfo[];
}

export function useAutoConnect() {
    const [databases, setDatabases] = useAtom(databasesAtom);
    const [state, setState] = useState<AutoConnectState>({
        isAutoConnecting: false,
        autoConnectProgress: null,
        autoConnectError: null,
        connectedDatabases: []
    });

    // 在组件挂载时自动连接
    useEffect(() => {
        let mounted = true;

        const performAutoConnect = async () => {
            if (!AutoConnectService.shouldShowAutoConnectPrompt()) {
                return;
            }

            setState(prev => ({
                ...prev,
                isAutoConnecting: true,
                autoConnectError: null
            }));

            try {
                const connectedDatabases = await AutoConnectService.autoConnect(
                    (message, current, total) => {
                        if (mounted) {
                            setState(prev => ({
                                ...prev,
                                autoConnectProgress: {message, current, total}
                            }));
                        }
                    },
                    (error) => {
                        if (mounted) {
                            setState(prev => ({
                                ...prev,
                                autoConnectError: error
                            }));
                        }
                    }
                );

                if (mounted) {
                    setState(prev => ({
                        ...prev,
                        connectedDatabases,
                        isAutoConnecting: false,
                        autoConnectProgress: null
                    }));

                    // 更新全局数据库状态
                    if (connectedDatabases.length > 0) {
                        setDatabases(connectedDatabases);
                    }
                }

            } catch (error) {
                if (mounted) {
                    const errorMessage = error instanceof Error ? error.message : '自动连接失败';
                    setState(prev => ({
                        ...prev,
                        isAutoConnecting: false,
                        autoConnectError: errorMessage,
                        autoConnectProgress: null
                    }));
                }
            }
        };

        // 延迟500ms开始自动连接，让UI先渲染
        const timer = setTimeout(performAutoConnect, 500);

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [setDatabases]);

    // 手动触发自动连接
    const triggerAutoConnect = async () => {
        setState(prev => ({
            ...prev,
            isAutoConnecting: true,
            autoConnectError: null,
            autoConnectProgress: null
        }));

        try {
            const connectedDatabases = await AutoConnectService.autoConnect(
                (message, current, total) => {
                    setState(prev => ({
                        ...prev,
                        autoConnectProgress: {message, current, total}
                    }));
                },
                (error) => {
                    setState(prev => ({
                        ...prev,
                        autoConnectError: error
                    }));
                }
            );

            setState(prev => ({
                ...prev,
                connectedDatabases,
                isAutoConnecting: false,
                autoConnectProgress: null
            }));

            // 更新全局数据库状态
            if (connectedDatabases.length > 0) {
                setDatabases(connectedDatabases);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '自动连接失败';
            setState(prev => ({
                ...prev,
                isAutoConnecting: false,
                autoConnectError: errorMessage,
                autoConnectProgress: null
            }));
        }
    };

    // 更新已连接数据库列表
    const updateConnectedDatabases = (newDatabases: DatabaseInfo[]) => {
        AutoConnectService.updateConnectedDatabases(newDatabases);
        setState(prev => ({
            ...prev,
            connectedDatabases: newDatabases
        }));
    };

    // 清除错误
    const clearError = () => {
        setState(prev => ({
            ...prev,
            autoConnectError: null
        }));
    };

    // 启用/禁用自动连接
    const toggleAutoConnect = (enabled: boolean) => {
        if (enabled) {
            AutoConnectService.enableAutoConnect();
        } else {
            AutoConnectService.disableAutoConnect();
        }
    };

    return {
        ...state,
        triggerAutoConnect,
        updateConnectedDatabases,
        clearError,
        toggleAutoConnect
    };
}