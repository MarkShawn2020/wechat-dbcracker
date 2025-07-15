import {DatabaseInfo} from '../types';
import {useAtom} from 'jotai';
import {keysFilePathAtom} from '../store/atoms';
import {Database, FolderOpen, Info, Key} from 'lucide-react';

interface DatabaseInfoProps {
    database: DatabaseInfo;
}

export function DatabaseInfoPanel({database}: DatabaseInfoProps) {
    const [keysPath] = useAtom(keysFilePathAtom);

    return (
        <div className="p-6 bg-slate-50">
            <div className="flex items-center space-x-2 mb-4">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Info className="h-4 w-4 text-blue-600"/>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Database Information</h3>
            </div>

            <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 space-y-3">
                    <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                            <Database className="h-3 w-3 text-slate-600"/>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-500 font-medium">Database Name</p>
                            <p className="text-sm text-slate-900 font-semibold">{database.filename}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                            <span className="text-xs text-slate-600 font-bold">T</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-500 font-medium">Database Type</p>
                            <p className="text-sm text-slate-900 font-semibold">{database.db_type}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                            <span className="text-xs text-slate-600 font-bold">S</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-500 font-medium">File Size</p>
                            <p className="text-sm text-slate-900 font-semibold">
                                {database.size ? `${(database.size / 1024).toFixed(1)} KB` : 'Unknown'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <div className="p-1.5 bg-amber-100 rounded-lg">
                            <Key className="h-3 w-3 text-amber-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 font-medium mb-1">Encryption Key</p>
                            <div className="bg-slate-100 rounded-lg p-2">
                                <p className="font-mono text-xs text-slate-700 break-all" title={database.key}>
                                    {database.key.substring(0, 32)}...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                            <FolderOpen className="h-3 w-3 text-slate-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 font-medium mb-1">File Path</p>
                            <div className="bg-slate-100 rounded-lg p-2">
                                <p className="font-mono text-xs text-slate-700 break-all">{database.path}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}