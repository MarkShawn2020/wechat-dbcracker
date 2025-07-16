import {DatabaseInfo, TableInfo} from '../types';
import {PropertyPanel} from './PropertyPanel';
import {TableView} from './TableView';
import {Database, Table} from 'lucide-react';

interface ContextPanelProps {
    selectedDatabase: DatabaseInfo | null;
    selectedTable: TableInfo | null;
    mode: 'database-properties' | 'table-data';
}

export function ContextPanel({selectedDatabase, selectedTable, mode}: ContextPanelProps) {
    // 未选择数据库时的空状态
    if (!selectedDatabase) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                    <div className="p-6 bg-blue-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <Database className="h-12 w-12 text-blue-500"/>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">选择一个数据库</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        从左侧列表中选择一个数据库来查看其详细信息和表格
                    </p>
                </div>
            </div>
        );
    }

    // 显示数据库属性
    if (mode === 'database-properties') {
        return (
            <div className="flex-1 overflow-hidden">
                <PropertyPanel 
                    selectedDatabase={selectedDatabase} 
                    selectedTable={null} 
                />
            </div>
        );
    }

    // 显示表格数据
    if (mode === 'table-data' && selectedTable) {
        return (
            <div className="flex-1 overflow-hidden">
                <TableView 
                    database={selectedDatabase} 
                    table={selectedTable} 
                />
            </div>
        );
    }

    // 选择了数据库但未选择表格时
    return (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
            <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                <div className="p-6 bg-green-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <Table className="h-12 w-12 text-green-500"/>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">选择一个表格</h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    从中间列表中选择一个表格来查看其数据内容
                </p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm text-green-800">
                        💡 提示: 表格列表显示在中间列
                    </p>
                </div>
            </div>
        </div>
    );
}