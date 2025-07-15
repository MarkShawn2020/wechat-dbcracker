import {invoke} from '@tauri-apps/api/core';
import {DatabaseInfo, DatabaseManagerApi, QueryResult, TableInfo} from './types';

export class DatabaseManager implements DatabaseManagerApi {
    async loadKeysFile(path: string): Promise<DatabaseInfo[]> {
        return await invoke('load_keys_file', {path});
    }

    async getDatabases(): Promise<DatabaseInfo[]> {
        return await invoke('get_databases');
    }

    async connectDatabase(dbId: string): Promise<void> {
        return await invoke('connect_database', {dbId});
    }

    async getTables(dbId: string): Promise<TableInfo[]> {
        return await invoke('get_tables', {dbId});
    }

    async queryTable(dbId: string, tableName: string, limit?: number, offset?: number): Promise<QueryResult> {
        return await invoke('query_table', {dbId, tableName, limit, offset});
    }

    async executeQuery(dbId: string, query: string): Promise<QueryResult> {
        return await invoke('execute_query', {dbId, query});
    }

    async disconnectDatabase(dbId: string): Promise<void> {
        return await invoke('disconnect_database', {dbId});
    }
}

export const dbManager = new DatabaseManager();