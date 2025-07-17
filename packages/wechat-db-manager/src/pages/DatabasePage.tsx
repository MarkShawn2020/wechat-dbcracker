import {useEffect, useState} from 'react';
import {DatabaseInfo, TableInfo} from '../types';
import {DatabaseList} from '../components/DatabaseList';
import {TableList} from '../components/TableList';
import {ContextPanel} from '../components/ContextPanel';
import {WelcomeGuide} from '../components/WelcomeGuide';
import {Database, Layers, RotateCcw, Search, Table} from 'lucide-react';
import {useAtom} from 'jotai';
import {databasesAtom, selectedDatabaseAtom, selectedTableAtom, thirdColumnModeAtom} from '../store/atoms';
import {Panel, PanelGroup, PanelResizeHandle} from 'react-resizable-panels';
import {hasCustomLayout, resetPanelLayout} from '../utils/layoutUtils';

export function DatabasePage() {
    const [selectedDatabase, setSelectedDatabase] = useAtom(selectedDatabaseAtom);
    const [selectedTable, setSelectedTable] = useAtom(selectedTableAtom);
    const [thirdColumnMode, setThirdColumnMode] = useAtom(thirdColumnModeAtom);
    const [databases] = useAtom(databasesAtom);
    const [searchTerm, setSearchTerm] = useState('');
    const [showResetButton, setShowResetButton] = useState(false);

    useEffect(() => {
        // 当数据库改变时重置表格选择和第三列模式
        setSelectedTable(null);
        setThirdColumnMode('database-properties');
    }, [selectedDatabase, setSelectedTable, setThirdColumnMode]);

    useEffect(() => {
        // 检查是否有自定义布局设置
        setShowResetButton(hasCustomLayout());
    }, []);

    const handleSelectDatabase = (database: DatabaseInfo) => {
        setSelectedDatabase(database);
        setSelectedTable(null);
        setThirdColumnMode('database-properties');
    };

    const handleSelectTable = (table: TableInfo) => {
        setSelectedTable(table);
        setThirdColumnMode('table-data');
    };

    const handleResetLayout = () => {
        if (confirm('确定要重置面板布局到默认设置吗？')) {
            resetPanelLayout();
        }
    };

    const filteredDatabases = databases.filter(db =>
        db.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        db.db_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full bg-gray-50">
            <PanelGroup
                direction="horizontal"
                autoSaveId="database-page-layout"
                onLayout={() => {
                    // 当面板布局改变时，检查是否需要显示重置按钮
                    setTimeout(() => setShowResetButton(hasCustomLayout()), 100);
                }}
            >
                {/* 第一列 - 数据库列表 */}
                <Panel
                    defaultSize={30}
                    minSize={20}
                    maxSize={50}
                    className="bg-white border-r border-gray-200"
                >
                    <div className="h-full flex flex-col overflow-hidden">
                        {/* 头部 - 不滚动 */}
                        <div className="flex-shrink-0 p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Database className="h-5 w-5 text-blue-600"/>
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-gray-900">数据库管理</h1>
                                        <p className="text-xs text-gray-600">Database Management</p>
                                    </div>
                                </div>

                                {/* 重置布局按钮 */}
                                {showResetButton && (
                                    <button
                                        onClick={handleResetLayout}
                                        className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="重置面板布局到默认设置"
                                    >
                                        <RotateCcw className="h-3 w-3"/>
                                        <span>重置布局</span>
                                    </button>
                                )}
                            </div>

                            {/* 搜索框 */}
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
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
                </Panel>

                <PanelResizeHandle
                    className="w-1 bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors cursor-col-resize relative group">
                    <div
                        className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 group-hover:w-1 group-active:w-1 transition-all"/>
                </PanelResizeHandle>

                {/* 第二列 - 表格列表 */}
                <Panel
                    defaultSize={25}
                    minSize={15}
                    maxSize={40}
                    className="bg-white border-r border-gray-200"
                >
                    {selectedDatabase ? (
                        <div className="h-full flex flex-col overflow-hidden">
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
                    ) : (
                        <div
                            className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-50">
                            <div className="text-center max-w-sm p-6">
                                <div
                                    className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                    <Table className="h-8 w-8 text-gray-400"/>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">表格列表</h3>
                                <p className="text-sm text-gray-600">
                                    选择一个数据库后，其表格列表将在此显示
                                </p>
                            </div>
                        </div>
                    )}
                </Panel>

                <PanelResizeHandle
                    className="w-1 bg-gray-200 hover:bg-blue-400 active:bg-blue-500 transition-colors cursor-col-resize relative group">
                    <div
                        className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 group-hover:w-1 group-active:w-1 transition-all"/>
                </PanelResizeHandle>

                {/* 第三列 - 上下文面板（数据库属性或表格数据） */}
                <Panel
                    defaultSize={45}
                    minSize={30}
                    maxSize={65}
                >
                    <ContextPanel
                        selectedDatabase={selectedDatabase}
                        selectedTable={selectedTable}
                        mode={thirdColumnMode}
                    />
                </Panel>
            </PanelGroup>
        </div>
    );
}