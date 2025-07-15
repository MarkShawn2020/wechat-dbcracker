import {useState} from 'react';
import {useAtom} from 'jotai';
import {databasesAtom, errorAtom, loadingAtom, persistedKeysPathAtom} from '../store/atoms';
import {dbManager} from '../api';
import {AlertCircle, Database, Edit3, File, FolderOpen, RefreshCw, Settings, X} from 'lucide-react';

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsPanel({isOpen, onClose}: SettingsPanelProps) {
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
        } catch (err) {
            setError(`Failed to load keys file: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async () => {
        try {
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div
                    className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Settings className="h-5 w-5 text-blue-600"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Settings</h2>
                            <p className="text-sm text-slate-600">Configure database keys and connection settings</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-600"/>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {/* Keys File Section */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                <FolderOpen className="h-4 w-4 text-slate-600"/>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Keys File Configuration</h3>
                        </div>

                        {isEditing ? (
                            <form onSubmit={handleManualInput} className="space-y-4">
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
                                                <Database className="h-4 w-4"/>
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
                                <div
                                    className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
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
                                    <button
                                        onClick={clearFile}
                                        className="text-xs text-green-600 hover:text-green-800 hover:bg-green-100 p-1.5 rounded transition-colors"
                                        title="Clear file"
                                    >
                                        <X className="h-4 w-4"/>
                                    </button>
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
                                <div
                                    className="text-center p-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                                    <div
                                        className="p-3 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                                        <FolderOpen className="h-8 w-8 text-slate-400"/>
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 mb-1">No keys file selected</p>
                                    <p className="text-xs text-slate-600">Choose a .keys file to load WeChat
                                        databases</p>
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

                    {/* Database Configuration Section */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                <Database className="h-4 w-4 text-slate-600"/>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Database Configuration</h3>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="font-medium text-slate-700">SQLCipher Version</label>
                                    <p className="text-slate-600">SQLCipher 3 (Default)</p>
                                </div>
                                <div>
                                    <label className="font-medium text-slate-700">Page Size</label>
                                    <p className="text-slate-600">1024 bytes</p>
                                </div>
                                <div>
                                    <label className="font-medium text-slate-700">KDF Iterations</label>
                                    <p className="text-slate-600">64,000</p>
                                </div>
                                <div>
                                    <label className="font-medium text-slate-700">HMAC Algorithm</label>
                                    <p className="text-slate-600">SHA1</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-6 bg-slate-50">
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}