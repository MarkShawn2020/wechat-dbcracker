import { useState } from 'react';
import { useAtom } from 'jotai';
import { keysFilePathAtom, databasesAtom } from '../store/atoms';
import { Database, FileText, Table, Download, X } from 'lucide-react';

export function WelcomeGuide() {
  const [keysPath] = useAtom(keysFilePathAtom);
  const [databases] = useAtom(databasesAtom);
  const [isVisible, setIsVisible] = useState(true);

  // 如果已经有文件和数据库，就隐藏引导
  if (keysPath && databases.length > 0) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg mx-4 my-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-900">Welcome to WeChat DB Manager</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-blue-500 hover:text-blue-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 text-sm text-blue-800">
        <p>
          This tool helps you manage and browse WeChat SQLCipher databases. Here's how to get started:
        </p>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Select your keys file</p>
              <p className="text-blue-700">
                Use the "Browse Files" button to select your <code className="bg-blue-100 px-1 rounded">.keys</code> file, 
                or click "Enter Path" to type the full path manually.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Browse databases</p>
              <p className="text-blue-700">
                Once loaded, select a database from the list to view its tables and information.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Explore data</p>
              <p className="text-blue-700">
                Click on tables to view their contents, execute custom queries, and export data as CSV.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4 pt-2 border-t border-blue-200">
          <div className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span className="text-xs">Keys File</span>
          </div>
          <div className="flex items-center space-x-1">
            <Database className="h-4 w-4" />
            <span className="text-xs">Databases</span>
          </div>
          <div className="flex items-center space-x-1">
            <Table className="h-4 w-4" />
            <span className="text-xs">Tables</span>
          </div>
          <div className="flex items-center space-x-1">
            <Download className="h-4 w-4" />
            <span className="text-xs">Export</span>
          </div>
        </div>
      </div>
    </div>
  );
}