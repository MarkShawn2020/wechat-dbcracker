import { useState, useEffect } from 'react';
import { DatabaseInfo, TableInfo } from './types';
import { DatabaseList } from './components/DatabaseList';
import { TableList } from './components/TableList';
import { TableView } from './components/TableView';
import { FileManager } from './components/FileManager';
import { DatabaseInfoPanel } from './components/DatabaseInfo';
import { StatusBar } from './components/StatusBar';
import { WelcomeGuide } from './components/WelcomeGuide';
import { Database } from 'lucide-react';
import { useAtom } from 'jotai';
import { initializePersistedStateAtom, selectedDatabaseAtom } from './store/atoms';
import './App.css';

function App() {
  const [selectedDatabase, setSelectedDatabase] = useAtom(selectedDatabaseAtom);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [, initializeState] = useAtom(initializePersistedStateAtom);

  // 初始化持久化状态
  useEffect(() => {
    initializeState();
  }, [initializeState]);

  const handleSelectDatabase = (database: DatabaseInfo) => {
    setSelectedDatabase(database);
    setSelectedTable(null);
  };

  const handleFileLoaded = () => {
    // 文件加载后清除选择状态
    setSelectedDatabase(null);
    setSelectedTable(null);
  };

  const handleSelectTable = (table: TableInfo) => {
    setSelectedTable(table);
  };

  return (
    <div className="h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">WeChat DB Manager</h1>
          </div>
        </div>

        {/* File Manager */}
        <FileManager onFileLoaded={handleFileLoaded} />
        
        {/* Welcome Guide */}
        <WelcomeGuide />
        
        {/* Database List */}
        <div className="flex-1 overflow-auto">
          <DatabaseList
            onSelectDatabase={handleSelectDatabase}
            selectedDatabaseId={selectedDatabase?.id}
          />
        </div>

        {/* Database Info */}
        {selectedDatabase && (
          <DatabaseInfoPanel database={selectedDatabase} />
        )}

        {/* Table List */}
        {selectedDatabase && (
          <div className="border-t border-gray-200 max-h-64 overflow-auto">
            <TableList
              database={selectedDatabase}
              onSelectTable={handleSelectTable}
              selectedTableName={selectedTable?.name}
            />
          </div>
        )}
        
        {/* Status Bar */}
        <StatusBar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedDatabase && selectedTable ? (
          <TableView
            database={selectedDatabase}
            table={selectedTable}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                WeChat Database Manager
              </h2>
              <p className="text-gray-600 max-w-md">
                Select a database from the sidebar to view its tables and data.
                Load your WeChat database keys to get started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
