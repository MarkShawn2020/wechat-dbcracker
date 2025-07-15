export interface DatabaseInfo {
    id: string;
    path: string;
    key: string;
    cipher_compatibility: number;
    db_type: string;
    filename: string;
    size?: number;
    accessible: boolean;
    last_modified?: string;
}

export interface TableInfo {
    name: string;
    columns: ColumnInfo[];
    row_count?: number;
}

export interface ColumnInfo {
    name: string;
    type_name: string;
    nullable: boolean;
    primary_key: boolean;
}

export interface QueryResult {
    columns: string[];
    rows: any[][];
    total_rows: number;
}

export interface DatabaseManagerApi {
    loadKeysFile(path: string): Promise<DatabaseInfo[]>;

    getDatabases(): Promise<DatabaseInfo[]>;

    connectDatabase(dbId: string): Promise<void>;

    getTables(dbId: string): Promise<TableInfo[]>;

    queryTable(dbId: string, tableName: string, limit?: number, offset?: number): Promise<QueryResult>;

    executeQuery(dbId: string, query: string): Promise<QueryResult>;

    disconnectDatabase(dbId: string): Promise<void>;
}

export const DB_TYPE_LABELS: Record<string, string> = {
    'KeyValue': 'Key-Value Store',
    'WebTemplate': 'Web Templates',
    'Contact': 'Contacts',
    'Session': 'Sessions',
    'Message': 'Messages',
    'brand': 'Brand Messages',
    'Group': 'Groups',
    'Favorites': 'Favorites',
    'Sns': 'Social Network',
    'Sync': 'Sync Data',
    'MMLive': 'Live Stream',
    'Account': 'Account Info',
    'Stickers': 'Stickers',
    'fts': 'Full-text Search',
    'ftsfile': 'File Search',
    'mediaData': 'Media Data',
    'unknown': 'Unknown'
};

export const DB_TYPE_COLORS: Record<string, string> = {
    'KeyValue': 'bg-blue-100 text-blue-800',
    'WebTemplate': 'bg-green-100 text-green-800',
    'Contact': 'bg-purple-100 text-purple-800',
    'Session': 'bg-yellow-100 text-yellow-800',
    'Message': 'bg-red-100 text-red-800',
    'brand': 'bg-indigo-100 text-indigo-800',
    'Group': 'bg-pink-100 text-pink-800',
    'Favorites': 'bg-orange-100 text-orange-800',
    'Sns': 'bg-cyan-100 text-cyan-800',
    'Sync': 'bg-gray-100 text-gray-800',
    'MMLive': 'bg-teal-100 text-teal-800',
    'Account': 'bg-emerald-100 text-emerald-800',
    'Stickers': 'bg-lime-100 text-lime-800',
    'fts': 'bg-violet-100 text-violet-800',
    'ftsfile': 'bg-rose-100 text-rose-800',
    'mediaData': 'bg-amber-100 text-amber-800',
    'unknown': 'bg-slate-100 text-slate-800'
};