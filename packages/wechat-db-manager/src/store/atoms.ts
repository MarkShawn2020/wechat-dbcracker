import {atom} from 'jotai';
import {DatabaseInfo, TableInfo} from '../types';

// 配置相关的原子状态
export const keysFilePathAtom = atom<string | null>(null);
export const lastUsedKeysPathAtom = atom<string | null>(null);

// 数据库相关的原子状态
export const databasesAtom = atom<DatabaseInfo[]>([]);
export const selectedDatabaseAtom = atom<DatabaseInfo | null>(null);
export const selectedTableAtom = atom<TableInfo | null>(null);
export const loadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);

// 第三列上下文模式
export const thirdColumnModeAtom = atom<'database-properties' | 'table-data'>('database-properties');

// 持久化存储的原子状态
export const persistedKeysPathAtom = atom(
    (get) => get(keysFilePathAtom),
    (get, set, newPath: string | null) => {
        set(keysFilePathAtom, newPath);
        if (newPath) {
            localStorage.setItem('wechat-db-manager-keys-path', newPath);
        } else {
            localStorage.removeItem('wechat-db-manager-keys-path');
        }
    }
);

// 初始化持久化状态
export const initializePersistedStateAtom = atom(
    null,
    (get, set) => {
        const savedPath = localStorage.getItem('wechat-db-manager-keys-path');
        if (savedPath) {
            set(keysFilePathAtom, savedPath);
        }
    }
);