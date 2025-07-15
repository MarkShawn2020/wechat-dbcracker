import { DatabaseInfo } from '../types';
import { useAtom } from 'jotai';
import { keysFilePathAtom } from '../store/atoms';
import { Info, Database, Key, FolderOpen } from 'lucide-react';

interface DatabaseInfoProps {
  database: DatabaseInfo;
}

export function DatabaseInfoPanel({ database }: DatabaseInfoProps) {
  const [keysPath] = useAtom(keysFilePathAtom);

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center space-x-2 mb-3">
        <Info className="h-5 w-5 text-blue-600" />
        <h3 className="text-sm font-medium text-gray-900">Database Information</h3>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center space-x-2">
          <Database className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600">Name:</span>
          <span className="font-medium text-gray-900">{database.filename}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Type:</span>
          <span className="font-medium text-gray-900">{database.db_type}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Size:</span>
          <span className="font-medium text-gray-900">
            {database.size ? `${(database.size / 1024).toFixed(1)} KB` : 'Unknown'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Key className="h-3 w-3 text-gray-500" />
          <span className="text-gray-600">Key:</span>
          <span className="font-mono text-gray-900 truncate" title={database.key}>
            {database.key.substring(0, 20)}...
          </span>
        </div>
        
        <div className="flex items-start space-x-2">
          <FolderOpen className="h-3 w-3 text-gray-500 mt-0.5" />
          <span className="text-gray-600">Path:</span>
          <span className="text-gray-900 text-wrap break-all">{database.path}</span>
        </div>
      </div>
    </div>
  );
}