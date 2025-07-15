import {useState} from 'react';
import {open} from '@tauri-apps/api/dialog';
import {useAtom} from 'jotai';
import {databasesAtom, errorAtom, loadingAtom, persistedKeysPathAtom} from '../store/atoms';
import {dbManager} from '../api';
import {File, FolderOpen, X} from 'lucide-react';

interface FileSelectorProps {
    onFileLoaded?: () => void;
}

export function FileSelector({onFileLoaded}: FileSelectorProps) {
    const [keysPath, setKeysPath] = useAtom(persistedKeysPathAtom);
    const [loading, setLoading] = useAtom(loadingAtom);
    const [error, setError] = useAtom(errorAtom);
    const [, setDatabases] = useAtom(databasesAtom);
    const [isSelecting, setIsSelecting] = useState(false);

    const selectFile = async () => {
        try {
            setIsSelecting(true);
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
                setKeysPath(selected);
                await loadFile(selected);
            }
        } catch (err) {
            setError(`Failed to select file: ${err}`);
        } finally {
            setIsSelecting(false);
        }
    };

    const loadFile = async (path: string) => {
        try {
            setLoading(true);
            setError(null);

            const databases = await dbManager.loadKeysFile(path);
            setDatabases(databases);
            onFileLoaded?.();
        } catch (err) {
            setError(`Failed to load keys file: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const reloadCurrentFile = async () => {
        if (keysPath) {
            await loadFile(keysPath);
        }
    };

    const clearFile = () => {
        setKeysPath(null);
        setDatabases([]);
        setError(null);
    };

    return (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Keys File</h3>
                {keysPath && (
                    <button
                        onClick={clearFile}
                        className="text-xs text-gray-500 hover:text-gray-700"
                        title="Clear file"
                    >
                        <X className="h-4 w-4"/>
                    </button>
                )}
            </div>

            {keysPath ? (
                <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-2 bg-white rounded-lg border">
                        <File className="h-4 w-4 text-gray-600"/>
                        <span className="text-sm text-gray-700 truncate flex-1" title={keysPath}>
              {keysPath.split('/').pop() || keysPath}
            </span>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={reloadCurrentFile}
                            disabled={loading}
                            className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-2 py-1 rounded"
                        >
                            {loading ? 'Loading...' : 'Reload'}
                        </button>

                        <button
                            onClick={selectFile}
                            disabled={isSelecting || loading}
                            className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-2 py-1 rounded"
                        >
                            {isSelecting ? 'Selecting...' : 'Change'}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={selectFile}
                    disabled={isSelecting || loading}
                    className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                    <FolderOpen className="h-5 w-5 text-gray-400"/>
                    <span className="text-sm text-gray-600">
            {isSelecting ? 'Selecting...' : 'Select Keys File'}
          </span>
                </button>
            )}

            {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {error}
                </div>
            )}
        </div>
    );
}