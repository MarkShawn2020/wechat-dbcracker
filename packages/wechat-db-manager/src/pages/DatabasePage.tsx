import {useEffect, useState} from 'react';
import {DatabaseInfo, TableInfo} from '../types';
import {DatabaseList} from '../components/DatabaseList';
import {TableList} from '../components/TableList';
import {ContextPanel} from '../components/ContextPanel';
import {WelcomeGuide} from '../components/WelcomeGuide';
import {Database, Layers, Search, Table} from 'lucide-react';
import {useAtom} from 'jotai';
import {databasesAtom, selectedDatabaseAtom, selectedTableAtom, thirdColumnModeAtom} from '../store/atoms';

export function DatabasePage() {
    const [selectedDatabase, setSelectedDatabase] = useAtom(selectedDatabaseAtom);
    const [selectedTable, setSelectedTable] = useAtom(selectedTableAtom);
    const [thirdColumnMode, setThirdColumnMode] = useAtom(thirdColumnModeAtom);
    const [databases] = useAtom(databasesAtom);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // 当数据库改变时重置表格选择和第三列模式
        setSelectedTable(null);
        setThirdColumnMode('database-properties');
    }, [selectedDatabase, setSelectedTable, setThirdColumnMode]);

    const handleSelectDatabase = (database: DatabaseInfo) => {
        setSelectedDatabase(database);
        setSelectedTable(null);
        setThirdColumnMode('database-properties');
    };

    const handleSelectTable = (table: TableInfo) => {
        setSelectedTable(table);
        setThirdColumnMode('table-data');
    };

    const filteredDatabases = databases.filter(db =>
        db.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        db.db_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex bg-gray-50 overflow-hidden">
            {/* 第一列 - 数据库列表 */}
            <div className="flex-1 bg-white border-r border-gray-200 flex flex-col overflow-hidden min-w-0">
                {/* 头部 - 不滚动 */}
                <div className="flex-shrink-0 p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Database className="h-5 w-5 text-blue-600"/>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">数据库管理</h1>
                            <p className="text-xs text-gray-600">Database Management</p>
                        </div>
                    </div>

                    {/* 搜索框 */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                        <input
                            type="text"
                            placeholder="搜索数据库..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {/* 欢迎指引 */}
                {databases.length === 0 && (
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <WelcomeGuide/>
                    </div>
                )}

                {/* 数据库列表 - 独立滚动 */}
                {databases.length > 0 && (
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-3 px-3">
                                <h2 className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Layers className="h-4 w-4 mr-2"/>
                                    数据库列表
                                </h2>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {filteredDatabases.length}
                                </span>
                            </div>
                            <DatabaseList
                                onSelectDatabase={handleSelectDatabase}
                                selectedDatabaseId={selectedDatabase?.id}
                                databases={filteredDatabases}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 第二列 - 表格列表，仅在选中数据库时显示 */}
            {selectedDatabase && (
                <div className="flex-1 bg-white border-r border-gray-200 flex flex-col overflow-hidden min-w-0">
                    <div className="flex-shrink-0 p-6 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700 flex items-center">
                            <Table className="h-4 w-4 mr-2"/>
                            表格列表
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">{selectedDatabase.filename}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <TableList
                            database={selectedDatabase}
                            onSelectTable={handleSelectTable}
                            selectedTableName={selectedTable?.name}
                        />
                    </div>
                </div>
            )}

            {/* 第三列 - 上下文面板（数据库属性或表格数据） */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <ContextPanel 
                    selectedDatabase={selectedDatabase}
                    selectedTable={selectedTable}
                    mode={thirdColumnMode}
                />
            </div>
        </div>
    );
}