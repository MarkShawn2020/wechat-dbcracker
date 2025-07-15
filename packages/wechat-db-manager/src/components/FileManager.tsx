import { useState } from 'react';
import { useAtom } from 'jotai';
import { persistedKeysPathAtom, loadingAtom, errorAtom, databasesAtom } from '../store/atoms';
import { dbManager } from '../api';
import { FolderOpen, File, X, Edit3, RefreshCw, AlertCircle } from 'lucide-react';

interface FileManagerProps {
  onFileLoaded?: () => void;
}

export function FileManager({ onFileLoaded }: FileManagerProps) {
  const [keysPath, setKeysPath] = useAtom(persistedKeysPathAtom);
  const [loading, setLoading] = useAtom(loadingAtom);
  const [error, setError] = useAtom(errorAtom);
  const [, setDatabases] = useAtom(databasesAtom);
  const [inputPath, setInputPath] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const loadFile = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const databases = await dbManager.loadKeysFile(path);
      setDatabases(databases);
      setKeysPath(path);
      setIsEditing(false);
      onFileLoaded?.();
    } catch (err) {
      setError(`Failed to load keys file: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async () => {
    try {
      // 尝试使用 Tauri 文件对话框
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Keys File',
            extensions: ['keys', 'txt']
          },
          {
            name: 'All Files',
            extensions: ['*']
          }
        ],
        title: 'Select WeChat Database Keys File'
      });

      if (selected && typeof selected === 'string') {
        await loadFile(selected);
      }
    } catch (err) {
      // 如果文件对话框失败，切换到手动输入模式
      setError('File dialog not available. Please enter the file path manually.');
      setIsEditing(true);
    }
  };

  const handleManualInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPath.trim()) {
      await loadFile(inputPath.trim());
    }
  };

  const clearFile = () => {
    setKeysPath(null);
    setInputPath('');
    setDatabases([]);
    setError(null);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setInputPath('');
    setIsEditing(false);
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Keys File</h3>
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
        <form onSubmit={handleManualInput} className="space-y-2">
          <div className="flex items-center space-x-2">
            <File className="h-4 w-4 text-gray-600" />
            <input
              type="text"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="Enter full path to .keys file..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading || !inputPath.trim()}
              className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-1 rounded"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
            
            <button
              type="button"
              onClick={cancelEdit}
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
              {keysPath.split('/').pop() || keysPath}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => loadFile(keysPath)}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-1 rounded"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Loading...' : 'Reload'}</span>
            </button>
            
            <button
              onClick={handleFileSelect}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-1 text-xs bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-2 py-1 rounded"
            >
              <FolderOpen className="h-3 w-3" />
              <span>Browse</span>
            </button>
            
            <button
              onClick={() => setIsEditing(true)}
              disabled={loading}
              className="flex items-center justify-center text-xs bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-2 py-1 rounded"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">No keys file selected</span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleFileSelect}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Browse Files</span>
            </button>
            
            <button
              onClick={() => setIsEditing(true)}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-2 text-xs bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-3 py-2 rounded"
            >
              <Edit3 className="h-4 w-4" />
              <span>Enter Path</span>
            </button>
          </div>
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