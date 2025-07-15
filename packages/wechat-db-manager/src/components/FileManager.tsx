import {useState} from 'react';
import {useAtom} from 'jotai';
import {databasesAtom, errorAtom, loadingAtom, persistedKeysPathAtom} from '../store/atoms';
import {dbManager} from '../api';
import {AlertCircle, Edit3, File, FolderOpen, RefreshCw, X} from 'lucide-react';

interface FileManagerProps {
    onFileLoaded?: () => void;
}

export function FileManager({onFileLoaded}: FileManagerProps) {
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
            const {open} = await import('@tauri-apps/plugin-dialog');
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
        <div className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-slate-100 rounded-lg">
                        <FolderOpen className="h-4 w-4 text-slate-600"/>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">Keys File</h3>
                </div>
                {keysPath && !isEditing && (
                    <button
                        onClick={clearFile}
                        className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
                        title="Clear file"
                    >
                        <X className="h-4 w-4"/>
                    </button>
                )}
            </div>

            {isEditing ? (
                <form onSubmit={handleManualInput} className="space-y-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <File className="h-4 w-4 text-slate-400"/>
                        </div>
                        <input
                            type="text"
                            value={inputPath}
                            onChange={(e) => setInputPath(e.target.value)}
                            placeholder="Enter full path to .keys file..."
                            className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex space-x-2">
                        <button
                            type="submit"
                            disabled={loading || !inputPath.trim()}
                            className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin"/>
                                    <span>Loading...</span>
                                </>
                            ) : (
                                <>
                                    <span>Load File</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={loading}
                            className="flex items-center justify-center bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : keysPath ? (
                <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <File className="h-4 w-4 text-green-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-900 truncate" title={keysPath}>
                                {keysPath.split('/').pop() || keysPath}
                            </p>
                            <p className="text-xs text-green-600 truncate">
                                {keysPath.split('/').slice(0, -1).join('/') || '/'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => loadFile(keysPath)}
                            disabled={loading}
                            className="flex items-center justify-center space-x-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                        >
                            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}/>
                            <span>{loading ? 'Loading...' : 'Reload'}</span>
                        </button>

                        <button
                            onClick={handleFileSelect}
                            disabled={loading}
                            className="flex items-center justify-center space-x-1 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                        >
                            <FolderOpen className="h-3 w-3"/>
                            <span>Browse</span>
                        </button>

                        <button
                            onClick={() => setIsEditing(true)}
                            disabled={loading}
                            className="flex items-center justify-center bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                            title="Edit path"
                        >
                            <Edit3 className="h-3 w-3"/>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="text-center p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                        <div
                            className="p-3 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                            <FolderOpen className="h-8 w-8 text-slate-400"/>
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-1">No keys file selected</p>
                        <p className="text-xs text-slate-600">Choose a .keys file to load WeChat databases</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleFileSelect}
                            disabled={loading}
                            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                        >
                            <FolderOpen className="h-4 w-4"/>
                            <span>Browse Files</span>
                        </button>

                        <button
                            onClick={() => setIsEditing(true)}
                            disabled={loading}
                            className="flex items-center justify-center space-x-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Edit3 className="h-4 w-4"/>
                            <span>Enter Path</span>
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0"/>
                        <div>
                            <p className="text-sm font-medium text-red-900">Error</p>
                            <p className="text-xs text-red-700 mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}