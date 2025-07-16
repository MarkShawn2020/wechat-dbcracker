import {useEffect, useState} from 'react';
import {DatabaseInfo, TableInfo} from '../types';
import {DatabaseList} from '../components/DatabaseList';
import {TableList} from '../components/TableList';
import {TableView} from '../components/TableView';
import {PropertyPanel} from '../components/PropertyPanel';
import {WelcomeGuide} from '../components/WelcomeGuide';
import {Database, Layers, Search, Table} from 'lucide-react';
import {useAtom} from 'jotai';
import {databasesAtom, selectedDatabaseAtom} from '../store/atoms';

export function DatabasePage() {
    const [selectedDatabase, setSelectedDatabase] = useAtom(selectedDatabaseAtom);
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
    const [databases] = useAtom(databasesAtom);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // 当数据库改变时重置表格选择
        setSelectedTable(null);
    }, [selectedDatabase]);

    const handleSelectDatabase = (database: DatabaseInfo) => {
        setSelectedDatabase(database);
        setSelectedTable(null);
    };

    const handleSelectTable = (table: TableInfo) => {
        setSelectedTable(table);
    };

    const filteredDatabases = databases.filter(db =>
        db.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        db.db_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex bg-gray-50 overflow-hidden">
            {/* 左侧面板 - 数据库和表格列表，独立滚动 */}
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
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

                {/* 表格列表 - 不滚动的固定区域 */}
                {selectedDatabase && (
                    <div className="flex-shrink-0 border-t border-gray-100 bg-white">
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-3 px-3">
                                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                                    <Table className="h-4 w-4 mr-2"/>
                                    表格列表
                                </h3>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                <TableList
                                    database={selectedDatabase}
                                    onSelectTable={handleSelectTable}
                                    selectedTableName={selectedTable?.name}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 中央面板 - 表格内容，独立滚动 */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedDatabase && selectedTable ? (
                    <TableView
                        database={selectedDatabase}
                        table={selectedTable}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 overflow-y-auto">
                        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                            <div className="p-6 bg-blue-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                                {selectedDatabase ? (
                                    <Table className="h-12 w-12 text-blue-500"/>
                                ) : (
                                    <Database className="h-12 w-12 text-blue-500"/>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-3">
                                {selectedDatabase ? '选择一个表格' : '选择一个数据库'}
                            </h2>
                            <p className="text-gray-600 text-sm leading-relaxed mb-6">
                                {selectedDatabase
                                    ? '从左侧列表中选择一个表格来查看其数据和结构'
                                    : '从左侧列表中选择一个数据库来查看其表格和数据'
                                }
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-sm text-blue-800">
                                    💡 提示: {selectedDatabase
                                    ? '表格列表显示在数据库列表下方'
                                    : '使用设置页面来配置你的 .keys 文件'
                                }
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 右侧面板 - 属性，独立滚动，仅在选中数据库时显示 */}
            {selectedDatabase && (
                <div className="w-80 border-l border-gray-200 bg-white overflow-hidden">
                    <PropertyPanel
                        selectedDatabase={selectedDatabase}
                        selectedTable={selectedTable}
                    />
                </div>
            )}
        </div>
    );
}