import {useEffect, useState} from 'react';
import {DatabaseInfo, TableInfo} from '../types';
import {dbManager} from '../api';
import {AlertCircle, Hash, Loader, Table} from 'lucide-react';
import {clsx} from 'clsx';

interface TableListProps {
    database: DatabaseInfo;
    onSelectTable: (table: TableInfo) => void;
    selectedTableName?: string;
}

export function TableList({database, onSelectTable, selectedTableName}: TableListProps) {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (database) {
            connectAndLoadTables();
        }
    }, [database]);

    const connectAndLoadTables = async () => {
        try {
            setLoading(true);
            setError(null);

            // Connect to the database
            await dbManager.connectDatabase(database.id);
            setConnected(true);

            // Load tables
            const tableList = await dbManager.getTables(database.id);
            setTables(tableList);
        } catch (err) {
            setError(`Failed to connect to database: ${err}`);
            setConnected(false);
        } finally {
            setLoading(false);
        }
    };

    const formatRowCount = (count?: number): string => {
        if (count === undefined) return 'Unknown';
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader className="h-6 w-6 animate-spin text-blue-600"/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5"/>
                    <div>
                        <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                        <button
                            onClick={connectAndLoadTables}
                            className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
                        >
                            Retry Connection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="p-4 text-center">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2"/>
                <p className="text-sm text-gray-600">Not connected to database</p>
            </div>
        );
    }

    if (tables.length === 0) {
        return (
            <div className="p-4 text-center">
                <Table className="h-8 w-8 text-gray-400 mx-auto mb-2"/>
                <p className="text-sm text-gray-600">No tables found in this database</p>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tables</h3>
                <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"/>
                    <span className="text-sm text-gray-600">Connected</span>
                </div>
            </div>

            <div className="space-y-1">
                {tables.map((table) => (
                    <div
                        key={table.name}
                        onClick={() => onSelectTable(table)}
                        className={clsx(
                            'p-3 rounded-lg border cursor-pointer transition-colors',
                            selectedTableName === table.name
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Table className="h-4 w-4 text-gray-600"/>
                                <span className="font-medium text-gray-900">{table.name}</span>
                            </div>

                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                    <Hash className="h-3 w-3"/>
                                    <span>{formatRowCount(table.row_count)} rows</span>
                                </div>
                                <div className="text-gray-400">{table.columns.length} cols</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}