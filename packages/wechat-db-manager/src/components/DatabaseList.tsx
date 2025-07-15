import {useEffect} from 'react';
import {DatabaseInfo, DB_TYPE_COLORS, DB_TYPE_LABELS} from '../types';
import {AlertCircle, Calendar, Database, HardDrive, RefreshCw} from 'lucide-react';
import {clsx} from 'clsx';
import {useAtom} from 'jotai';
import {databasesAtom, errorAtom, keysFilePathAtom, loadingAtom} from '../store/atoms';
import {dbManager} from '../api';

interface DatabaseListProps {
    onSelectDatabase: (database: DatabaseInfo) => void;
    selectedDatabaseId?: string;
    databases?: DatabaseInfo[]; // Optional databases prop for filtered lists
}

export function DatabaseList({onSelectDatabase, selectedDatabaseId, databases: propDatabases}: DatabaseListProps) {
    const [globalDatabases, setDatabases] = useAtom(databasesAtom);
    const [loading, setLoading] = useAtom(loadingAtom);
    const [error, setError] = useAtom(errorAtom);
    const [keysPath] = useAtom(keysFilePathAtom);

    // Use prop databases if provided, otherwise use global state
    const databases = propDatabases || globalDatabases;

    useEffect(() => {
        // Only auto-load if we're using global state (not prop databases)
        if (!propDatabases && keysPath && globalDatabases.length === 0 && !loading) {
            reloadDatabases();
        }
    }, [keysPath, propDatabases]);

    const loadDatabases = async () => {
        try {
            setLoading(true);
            const dbs = await dbManager.getDatabases();
            // Deduplicate databases based on path
            const uniqueDbs = dbs.filter((db, index, self) =>
                index === self.findIndex(d => d.path === db.path)
            );
            setDatabases(uniqueDbs);
        } catch (err) {
            setError(`Failed to load databases: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const reloadDatabases = async () => {
        if (!keysPath) {
            setError('No keys file selected');
            return;
        }

        try {
            setLoading(true);
            const dbs = await dbManager.loadKeysFile(keysPath);
            // Deduplicate databases based on path
            const uniqueDbs = dbs.filter((db, index, self) =>
                index === self.findIndex(d => d.path === db.path)
            );
            setDatabases(uniqueDbs);
            setError(null);
        } catch (err) {
            setError(`Failed to load keys file: ${err}`);
        } finally {
            setLoading(false);
        }
    };

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

    const formatTime = (dateStr?: string): string => {
        if (!dateStr) return '';

        try {
            // First try parsing as Unix timestamp (seconds)
            const timestamp = parseFloat(dateStr);
            if (!isNaN(timestamp) && timestamp > 0) {
                // Unix timestamp in seconds
                const date = new Date(timestamp * 1000);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                }
            }

            // Try parsing as regular date string
            let date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }

            // Try ISO format variations
            const isoDate = new Date(dateStr.replace(/\s/, 'T'));
            if (!isNaN(isoDate.getTime())) {
                return isoDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }

            return '';
        } catch (error) {
            return '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-slate-600">Loading databases...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-red-600"/>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-red-900">Error Loading Databases</h3>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                            {keysPath && (
                                <button
                                    onClick={reloadDatabases}
                                    disabled={loading}
                                    className="mt-3 flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                >
                                    <RefreshCw className={clsx('h-3 w-3', loading && 'animate-spin')}/>
                                    <span>{loading ? 'Retrying...' : 'Retry'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (databases.length === 0 && !loading) {
        return (
            <div className="p-6 text-center">
                <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Database className="h-10 w-10 text-slate-400"/>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {propDatabases ? 'No Results Found' : 'No Databases Found'}
                </h3>
                <p className="text-sm text-slate-600 mb-6 max-w-xs mx-auto">
                    {propDatabases
                        ? 'No databases match your search criteria.'
                        : keysPath
                            ? 'No databases found in the selected keys file.'
                            : 'Select a keys file to get started.'
                    }
                </p>
                {!propDatabases && keysPath && (
                    <button
                        onClick={reloadDatabases}
                        disabled={loading}
                        className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 font-medium transition-colors mx-auto"
                    >
                        <RefreshCw className={clsx('h-3 w-3', loading && 'animate-spin')}/>
                        <span>{loading ? 'Loading...' : 'Reload'}</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={propDatabases ? "" : "p-4"}>
            {!propDatabases && (
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Database className="h-3 w-3 text-blue-600"/>
                        </div>
                        <h2 className="text-sm font-semibold text-slate-900">Databases</h2>
                    </div>
                    <button
                        onClick={reloadDatabases}
                        disabled={loading || !keysPath}
                        className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <RefreshCw className={clsx('h-3 w-3', loading && 'animate-spin')}/>
                        <span>{loading ? 'Loading...' : 'Reload'}</span>
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {databases.map((db, index) => (
                    <div
                        key={`${db.id}-${index}`}
                        onClick={() => onSelectDatabase(db)}
                        className={clsx(
                            'p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-sm',
                            selectedDatabaseId === db.id
                                ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-100'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        )}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <div className="p-1 bg-slate-100 rounded">
                                        <Database className="h-3 w-3 text-slate-600"/>
                                    </div>
                                    <span className="font-medium text-slate-900 truncate text-sm">{db.filename}</span>
                                    <span className={clsx(
                                        'px-1.5 py-0.5 text-xs rounded-full font-medium',
                                        DB_TYPE_COLORS[db.db_type] || DB_TYPE_COLORS.unknown
                                    )}>
                    {DB_TYPE_LABELS[db.db_type] || db.db_type}
                  </span>
                                </div>

                                <div className="flex items-center space-x-3 text-xs text-slate-500 mb-1">
                                    <div className="flex items-center space-x-1">
                                        <HardDrive className="h-2.5 w-2.5"/>
                                        <span>{formatFileSize(db.size)}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Calendar className="h-2.5 w-2.5"/>
                                        <span>{formatDate(db.last_modified)}</span>
                                        {formatTime(db.last_modified) && (
                                            <span className="text-slate-400">• {formatTime(db.last_modified)}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-xs text-slate-400 truncate font-mono">
                                    {db.path}
                                </div>
                            </div>

                            <div className="flex items-center ml-2">
                                {db.accessible ? (
                                    <div className="h-2 w-2 bg-green-500 rounded-full" title="Available"/>
                                ) : (
                                    <div className="h-2 w-2 bg-red-500 rounded-full" title="Unavailable"/>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}