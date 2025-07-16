import {useState} from 'react';
import {AlertCircle, CheckCircle, Database, FileText, FolderOpen, Info, Key, Settings} from 'lucide-react';
import {useAtom} from 'jotai';
import {databasesAtom, errorAtom, keysFilePathAtom, loadingAtom} from '../store/atoms';
import {dbManager} from '../api';
import {open} from '@tauri-apps/plugin-dialog';

export function SettingsPage() {
    const [keysPath, setKeysPath] = useAtom(keysFilePathAtom);
    const [databases, setDatabases] = useAtom(databasesAtom);
    const [loading, setLoading] = useAtom(loadingAtom);
    const [error, setError] = useAtom(errorAtom);
    const [success, setSuccess] = useState<string | null>(null);

    const selectKeysFile = async () => {
        try {
            const selected = await open({
                title: 'Select Keys File',
                filters: [
                    {
                        name: 'TOML Files',
                        extensions: ['toml']
                    },
                    {
                        name: 'All Files',
                        extensions: ['*']
                    }
                ]
            });

            if (selected) {
                setKeysPath(selected as string);
                await loadKeysFile(selected as string);
            }
        } catch (err) {
            setError(`Failed to select file: ${err}`);
        }
    };

    const loadKeysFile = async (path: string) => {
        try {
            setLoading(true);
            setError(null);
            setSuccess(null);

            const dbs = await dbManager.loadKeysFile(path);
            // Deduplicate databases based on path
            const uniqueDbs = dbs.filter((db, index, self) =>
                index === self.findIndex(d => d.path === db.path)
            );
            setDatabases(uniqueDbs);
            setSuccess(`Successfully loaded ${uniqueDbs.length} databases from keys file`);
        } catch (err) {
            setError(`Failed to load keys file: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const clearData = () => {
        setKeysPath('');
        setDatabases([]);
        setError(null);
        setSuccess('Data cleared successfully');
    };

    return (
        <div className="h-full bg-gray-50 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6 p-6">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl">
                            <Settings className="h-8 w-8 text-white"/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">应用设置</h1>
                            <p className="text-gray-600">配置和管理应用偏好设置</p>
                        </div>
                    </div>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5"/>
                            <div>
                                <h3 className="text-sm font-medium text-red-900">错误</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5"/>
                            <div>
                                <h3 className="text-sm font-medium text-green-900">成功</h3>
                                <p className="text-sm text-green-700 mt-1">{success}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Keys File Configuration */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Key className="h-5 w-5 text-blue-600"/>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">数据库密钥文件</h2>
                                <p className="text-sm text-gray-600">配置包含数据库路径和密钥的 TOML 文件</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Current Keys File */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                当前密钥文件
                            </label>
                            <div className="flex items-center space-x-3">
                                <div className="flex-1 p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex items-center space-x-2">
                                        <FileText className="h-4 w-4 text-gray-500"/>
                                        <span className="text-sm text-gray-900 font-mono truncate">
                      {keysPath || '未选择文件'}
                    </span>
                                    </div>
                                </div>
                                <button
                                    onClick={selectKeysFile}
                                    disabled={loading}
                                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
                                >
                                    <FolderOpen className="h-4 w-4"/>
                                    <span>选择文件</span>
                                </button>
                            </div>
                        </div>

                        {/* File Statistics */}
                        {keysPath && databases.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 rounded-xl p-4">
                                    <div className="flex items-center space-x-2">
                                        <Database className="h-5 w-5 text-blue-600"/>
                                        <span className="text-sm font-medium text-blue-900">数据库总数</span>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-900 mt-2">{databases.length}</div>
                                </div>
                                <div className="bg-green-50 rounded-xl p-4">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="h-5 w-5 text-green-600"/>
                                        <span className="text-sm font-medium text-green-900">可访问</span>
                                    </div>
                                    <div className="text-2xl font-bold text-green-900 mt-2">
                                        {databases.filter(db => db.accessible).length}
                                    </div>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-4">
                                    <div className="flex items-center space-x-2">
                                        <Database className="h-5 w-5 text-purple-600"/>
                                        <span className="text-sm font-medium text-purple-900">数据库类型</span>
                                    </div>
                                    <div className="text-2xl font-bold text-purple-900 mt-2">
                                        {new Set(databases.map(db => db.db_type)).size}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
                            {keysPath && (
                                <button
                                    onClick={() => loadKeysFile(keysPath)}
                                    disabled={loading}
                                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                                >
                                    <Database className="h-4 w-4"/>
                                    <span>{loading ? '重新加载中...' : '重新加载'}</span>
                                </button>
                            )}

                            {(keysPath || databases.length > 0) && (
                                <button
                                    onClick={clearData}
                                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    <AlertCircle className="h-4 w-4"/>
                                    <span>清除数据</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Help & Instructions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-amber-50 rounded-lg">
                                <Info className="h-5 w-5 text-amber-600"/>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">使用说明</h2>
                                <p className="text-sm text-gray-600">如何配置和使用密钥文件</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="bg-amber-50 rounded-xl p-4">
                            <h3 className="font-medium text-amber-900 mb-2">密钥文件格式</h3>
                            <p className="text-sm text-amber-800 mb-3">
                                密钥文件应为 TOML 格式，包含数据库路径和对应的加密密钥。
                            </p>
                            <div className="bg-amber-100 rounded-lg p-3 font-mono text-xs text-amber-900">
                                <div>[metadata]</div>
                                <div>version = "1.0.0"</div>
                                <div>generated_at = "2024-01-01T12:00:00Z"</div>
                                <div><br/></div>
                                <div>[[databases.Contact]]</div>
                                <div>path = "/path/to/contact.db"</div>
                                <div>key = "x'1234567890abcdef...'"</div>
                                <div>cipher_compatibility = 3</div>
                                <div>type = "Contact"</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 rounded-xl p-4">
                                <h3 className="font-medium text-blue-900 mb-2">💡 提示</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• 确保数据库文件路径正确</li>
                                    <li>• 密钥必须是十六进制格式</li>
                                    <li>• 支持多种数据库类型</li>
                                </ul>
                            </div>
                            <div className="bg-green-50 rounded-xl p-4">
                                <h3 className="font-medium text-green-900 mb-2">🔧 功能</h3>
                                <ul className="text-sm text-green-800 space-y-1">
                                    <li>• 自动检测数据库可访问性</li>
                                    <li>• 支持重复数据库去重</li>
                                    <li>• 实时错误提示和状态</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Application Info */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">应用信息</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-medium text-gray-900 mb-2">版本信息</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                <div>WeChat DB Manager v0.1.0</div>
                                <div>基于 Tauri 2.0 构建</div>
                                <div>支持 SQLCipher 数据库</div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 mb-2">技术栈</h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                <div>• React 18 + TypeScript</div>
                                <div>• Tauri 2.0 Framework</div>
                                <div>• Tailwind CSS</div>
                                <div>• Jotai 状态管理</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}