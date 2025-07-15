import { useEffect } from 'react';
import { DatabaseInfo, DB_TYPE_LABELS, DB_TYPE_COLORS } from '../types';
import { Database, HardDrive, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { useAtom } from 'jotai';
import { databasesAtom, loadingAtom, errorAtom, keysFilePathAtom } from '../store/atoms';
import { dbManager } from '../api';

interface DatabaseListProps {
  onSelectDatabase: (database: DatabaseInfo) => void;
  selectedDatabaseId?: string;
}

export function DatabaseList({ onSelectDatabase, selectedDatabaseId }: DatabaseListProps) {
  const [databases, setDatabases] = useAtom(databasesAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [keysPath] = useAtom(keysFilePathAtom);

  useEffect(() => {
    if (keysPath && databases.length === 0 && !loading) {
      reloadDatabases();
    }
  }, [keysPath]);

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
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            {keysPath && (
              <button
                onClick={reloadDatabases}
                disabled={loading}
                className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (databases.length === 0 && !loading) {
    return (
      <div className="p-4 text-center">
        <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Databases Found</h3>
        <p className="text-sm text-gray-600 mb-4">
          {keysPath ? 'No databases found in the selected keys file.' : 'Select a keys file to get started.'}
        </p>
        {keysPath && (
          <button
            onClick={reloadDatabases}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Reload'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">WeChat Databases</h2>
        <button
          onClick={reloadDatabases}
          disabled={loading || !keysPath}
          className="flex items-center space-x-1 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          <RefreshCw className={clsx('h-3 w-3', loading && 'animate-spin')} />
          <span>{loading ? 'Loading...' : 'Reload'}</span>
        </button>
      </div>

      <div className="space-y-2">
        {databases.map((db, index) => (
          <div
            key={`${db.id}-${index}`}
            onClick={() => onSelectDatabase(db)}
            className={clsx(
              'p-3 rounded-lg border cursor-pointer transition-colors',
              selectedDatabaseId === db.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Database className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-900 truncate">{db.filename}</span>
                  <span className={clsx(
                    'px-2 py-1 text-xs rounded-full',
                    DB_TYPE_COLORS[db.db_type] || DB_TYPE_COLORS.unknown
                  )}>
                    {DB_TYPE_LABELS[db.db_type] || db.db_type}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <HardDrive className="h-3 w-3" />
                    <span>{formatFileSize(db.size)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(db.last_modified)}</span>
                  </div>
                </div>
                
                <div className="mt-1 text-xs text-gray-400 truncate">
                  {db.path}
                </div>
              </div>
              
              <div className="flex items-center ml-2">
                {db.accessible ? (
                  <div className="h-2 w-2 bg-green-500 rounded-full" title="Accessible" />
                ) : (
                  <div className="h-2 w-2 bg-red-500 rounded-full" title="Not accessible" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}