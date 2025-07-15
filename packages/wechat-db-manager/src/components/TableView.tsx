import {useEffect, useState} from 'react';
import {DatabaseInfo, QueryResult, TableInfo} from '../types';
import {dbManager} from '../api';
import {ChevronLeft, ChevronRight, Download, RefreshCw, Search} from 'lucide-react';
import {clsx} from 'clsx';

interface TableViewProps {
    database: DatabaseInfo;
    table: TableInfo;
}

export function TableView({database, table}: TableViewProps) {
    const [data, setData] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [customQuery, setCustomQuery] = useState('');
    const [showCustomQuery, setShowCustomQuery] = useState(false);

    useEffect(() => {
        if (database && table) {
            loadTableData();
        }
    }, [database, table, currentPage, pageSize]);

    const loadTableData = async () => {
        try {
            setLoading(true);
            setError(null);

            const offset = (currentPage - 1) * pageSize;
            const result = await dbManager.queryTable(
                database.id,
                table.name,
                pageSize,
                offset
            );

            setData(result);
        } catch (err) {
            setError(`Failed to load table data: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const executeCustomQuery = async () => {
        if (!customQuery.trim()) return;

        try {
            setLoading(true);
            setError(null);

            const result = await dbManager.executeQuery(database.id, customQuery);
            setData(result);
        } catch (err) {
            setError(`Failed to execute query: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = data ? Math.ceil(data.total_rows / pageSize) : 0;

    const renderCell = (value: any): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        return JSON.stringify(value);
    };

    const exportData = () => {
        if (!data) return;

        const csvContent = [
            data.columns.join(','),
            ...data.rows.map(row =>
                row.map(cell => `"${renderCell(cell).replace(/"/g, '""')}"`)
                    .join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${table.name}_export.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{table.name}</h2>
                        <p className="text-sm text-gray-600">
                            {data?.total_rows.toLocaleString() || 0} total rows
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowCustomQuery(!showCustomQuery)}
                            className={clsx(
                                'px-3 py-1 rounded text-sm border',
                                showCustomQuery
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            )}
                        >
                            <Search className="h-4 w-4"/>
                        </button>

                        <button
                            onClick={loadTableData}
                            disabled={loading}
                            className="px-3 py-1 rounded text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')}/>
                        </button>

                        <button
                            onClick={exportData}
                            disabled={!data || data.rows.length === 0}
                            className="px-3 py-1 rounded text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <Download className="h-4 w-4"/>
                        </button>
                    </div>
                </div>

                {/* Custom Query */}
                {showCustomQuery && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                            <input
                                type="text"
                                value={customQuery}
                                onChange={(e) => setCustomQuery(e.target.value)}
                                placeholder="Enter SQL query..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                onKeyPress={(e) => e.key === 'Enter' && executeCustomQuery()}
                            />
                            <button
                                onClick={executeCustomQuery}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                            >
                                Execute
                            </button>
                        </div>
                    </div>
                )}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1 || loading}
                            className="px-3 py-1 rounded text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <ChevronLeft className="h-4 w-4"/>
                        </button>

                        <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages || loading}
                            className="px-3 py-1 rounded text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
                {loading && (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {error && (
                    <div className="p-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {data && !loading && !error && (
                    <div className="min-w-full">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                {data.columns.map((column) => (
                                    <th
                                        key={column}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {data.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50">
                                    {row.map((cell, cellIndex) => (
                                        <td
                                            key={cellIndex}
                                            className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200 max-w-xs truncate"
                                            title={renderCell(cell)}
                                        >
                                            {renderCell(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}