import {DatabaseInfo, TableInfo} from '../types';
import {Calendar, Database, FolderOpen, Grid, HardDrive, Info, Key, Table} from 'lucide-react';

interface PropertyPanelProps {
    selectedDatabase: DatabaseInfo | null;
    selectedTable: TableInfo | null;
}

export function PropertyPanel({selectedDatabase, selectedTable}: PropertyPanelProps) {
    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return 'Unknown';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return 'No date';

        try {
            // First try parsing as Unix timestamp (seconds)
            const timestamp = parseFloat(dateStr);
            if (!isNaN(timestamp) && timestamp > 0) {
                // Unix timestamp in seconds
                const date = new Date(timestamp * 1000);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit'
                    });
                }
            }

            // Try parsing as regular date string
            let date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit'
                });
            }

            // Try ISO format variations
            const isoDate = new Date(dateStr.replace(/\s/, 'T'));
            if (!isNaN(isoDate.getTime())) {
                return isoDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit'
                });
            }

            // If all else fails, return raw string (truncated)
            return dateStr.length > 10 ? dateStr.substring(0, 10) + '...' : dateStr;
        } catch (error) {
            return dateStr.length > 10 ? dateStr.substring(0, 10) + '...' : dateStr;
        }
    };

    if (!selectedDatabase && !selectedTable) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="text-center">
                    <div
                        className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <Info className="h-10 w-10 text-slate-400"/>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Selection</h3>
                    <p className="text-sm text-slate-600 max-w-xs mx-auto">
                        Select a database or table to view its properties
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-white">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                        <Info className="h-4 w-4 text-blue-600"/>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">Properties</h2>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Database Properties */}
                {selectedDatabase && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                    <Database className="h-4 w-4 text-blue-600"/>
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900">Database Information</h3>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <span className="text-xs text-slate-600 font-bold">N</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-medium">Name</p>
                                        <p className="text-sm text-slate-900 font-semibold">{selectedDatabase.filename}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <span className="text-xs text-slate-600 font-bold">T</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-medium">Type</p>
                                        <p className="text-sm text-slate-900 font-semibold">{selectedDatabase.db_type}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <HardDrive className="h-3 w-3 text-slate-600"/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-medium">Size</p>
                                        <p className="text-sm text-slate-900 font-semibold">
                                            {formatFileSize(selectedDatabase.size)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <Calendar className="h-3 w-3 text-slate-600"/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-medium">Modified</p>
                                        <p className="text-sm text-slate-900 font-semibold">
                                            {formatDate(selectedDatabase.last_modified)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4">
                                <div className="flex items-start space-x-3">
                                    <div className="p-1.5 bg-amber-100 rounded-lg">
                                        <Key className="h-3 w-3 text-amber-600"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-500 font-medium mb-1">Encryption Key</p>
                                        <div className="bg-slate-100 rounded-lg p-2">
                                            <p className="font-mono text-xs text-slate-700 break-all"
                                               title={selectedDatabase.key}>
                                                {selectedDatabase.key.substring(0, 32)}...
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4">
                                <div className="flex items-start space-x-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <FolderOpen className="h-3 w-3 text-slate-600"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-500 font-medium mb-1">Path</p>
                                        <div className="bg-slate-100 rounded-lg p-2">
                                            <p className="font-mono text-xs text-slate-700 break-all">{selectedDatabase.path}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Table Properties */}
                {selectedTable && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-slate-200">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-green-100 rounded-lg">
                                    <Table className="h-4 w-4 text-green-600"/>
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900">Table Information</h3>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center space-x-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <span className="text-xs text-slate-600 font-bold">N</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-medium">Table Name</p>
                                        <p className="text-sm text-slate-900 font-semibold">{selectedTable.name}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <Grid className="h-3 w-3 text-slate-600"/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-medium">Columns</p>
                                        <p className="text-sm text-slate-900 font-semibold">{selectedTable.columns.length}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <span className="text-xs text-slate-600 font-bold">R</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 font-medium">Rows</p>
                                        <p className="text-sm text-slate-900 font-semibold">
                                            {selectedTable.row_count?.toLocaleString() || 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {selectedTable.columns.length > 0 && (
                                <div className="border-t border-slate-200 pt-4">
                                    <p className="text-xs text-slate-500 font-medium mb-2">Columns</p>
                                    <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                        <div className="space-y-2">
                                            {selectedTable.columns.map((column, index) => (
                                                <div key={index} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className={`w-2 h-2 rounded-full ${column.primary_key ? 'bg-amber-500' : 'bg-slate-400'}`}/>
                                                        <span
                                                            className="font-medium text-slate-900">{column.name}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-slate-600">{column.type_name}</span>
                                                        {column.primary_key && (
                                                            <span
                                                                className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-xs font-medium">PK</span>
                                                        )}
                                                        {!column.nullable && (
                                                            <span
                                                                className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-xs font-medium">NOT NULL</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}