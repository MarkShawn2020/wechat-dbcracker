import { useState } from 'react';
import { useAtom } from 'jotai';
import { persistedKeysPathAtom, loadingAtom, errorAtom, databasesAtom } from '../store/atoms';
import { dbManager } from '../api';
import { File, X, Check, AlertCircle } from 'lucide-react';

interface FilePathInputProps {
  onFileLoaded?: () => void;
}

export function FilePathInput({ onFileLoaded }: FilePathInputProps) {
  const [keysPath, setKeysPath] = useAtom(persistedKeysPathAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [, setDatabases] = useAtom(databasesAtom);
  const [inputPath, setInputPath] = useState(keysPath || '');
  const [isEditing, setIsEditing] = useState(false);

  const loadFile = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const databases = await dbManager.loadKeysFile(path);
      setDatabases(databases);
      setKeysPath(path);
      setInputPath(path);
      setIsEditing(false);
      onFileLoaded?.();
    } catch (err) {
      setError(`Failed to load keys file: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPath.trim()) {
      await loadFile(inputPath.trim());
    }
  };

  const handleCancel = () => {
    setInputPath(keysPath || '');
    setIsEditing(false);
  };

  const clearFile = () => {
    setKeysPath(null);
    setInputPath('');
    setDatabases([]);
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Keys File Path</h3>
        {keysPath && !isEditing && (
          <button
            onClick={clearFile}
            className="text-xs text-gray-500 hover:text-gray-700"
            title="Clear file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-center space-x-2">
            <File className="h-4 w-4 text-gray-600" />
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="Enter path to .keys file..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading || !inputPath.trim()}
              className="flex-1 flex items-center justify-center space-x-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-1 rounded"
            >
              <Check className="h-3 w-3" />
              <span>{loading ? 'Loading...' : 'Load'}</span>
            </button>
            
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-2 py-1 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : keysPath ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border">
            <File className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700 truncate flex-1" title={keysPath}>
              {keysPath}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => loadFile(keysPath)}
              disabled={loading}
              className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-1 rounded"
            >
              {loading ? 'Loading...' : 'Reload'}
            </button>
            
            <button
              onClick={() => setIsEditing(true)}
              disabled={loading}
              className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-2 py-1 rounded"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">No keys file selected</span>
          </div>
          
          <button
            onClick={() => setIsEditing(true)}
            className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
          >
            Enter File Path
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}