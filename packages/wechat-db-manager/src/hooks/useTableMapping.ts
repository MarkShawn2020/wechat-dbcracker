import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { databasesAtom } from '../store/atoms';
import { ChatDataService } from '../services/chatDataService';

/**
 * 表映射管理Hook
 * 当数据库列表变化时自动初始化表映射服务
 */
export function useTableMapping() {
    const [databases] = useAtom(databasesAtom);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const initializeMapping = async () => {
            if (databases.length === 0) {
                setIsInitialized(false);
                setIsInitializing(false);
                setStats(null);
                return;
            }

            if (isInitializing) return;

            setIsInitializing(true);
            try {
                console.log('🔄 数据库列表变化，初始化表映射服务...');
                await ChatDataService.initializeTableMapping(databases);
                
                const mappingStats = ChatDataService.getTableMappingStats();
                setStats(mappingStats);
                setIsInitialized(true);
                
                console.log('✅ 表映射服务初始化完成', mappingStats);
            } catch (error) {
                console.error('❌ 表映射服务初始化失败:', error);
                setIsInitialized(false);
            } finally {
                setIsInitializing(false);
            }
        };

        initializeMapping();
    }, [databases]); // ✅ 移除 isInitializing 依赖项

    return {
        isInitialized,
        isInitializing,
        stats
    };
}