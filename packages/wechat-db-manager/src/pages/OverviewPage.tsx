import {useMemo} from 'react';
import {DB_TYPE_LABELS} from '../types';
import {
    BarChart3,
    Calendar,
    Database,
    HardDrive,
    Layers,
    MessageSquare,
    PieChart,
    Settings,
    TrendingUp
} from 'lucide-react';
import {useAtom} from 'jotai';
import {databasesAtom} from '../store/atoms';

export function OverviewPage() {
    const [databases] = useAtom(databasesAtom);

    const stats = useMemo(() => {
        const totalDatabases = databases.length;
        const accessibleDatabases = databases.filter(db => db.accessible).length;
        const totalSize = databases.reduce((sum, db) => sum + (db.size || 0), 0);

        // Group by database type
        const typeGroups = databases.reduce((acc, db) => {
            const type = db.db_type;
            if (!acc[type]) {
                acc[type] = {count: 0, size: 0, accessible: 0};
            }
            acc[type].count++;
            acc[type].size += db.size || 0;
            if (db.accessible) acc[type].accessible++;
            return acc;
        }, {} as Record<string, { count: number; size: number; accessible: number }>);

        // Get most recent modification dates
        const recentDatabases = databases
            .filter(db => db.last_modified)
            .sort((a, b) => {
                const aTime = parseFloat(a.last_modified!) || 0;
                const bTime = parseFloat(b.last_modified!) || 0;
                return bTime - aTime;
            })
            .slice(0, 5);

        return {
            totalDatabases,
            accessibleDatabases,
            totalSize,
            typeGroups,
            recentDatabases,
            accessibilityRate: totalDatabases > 0 ? (accessibleDatabases / totalDatabases) * 100 : 0
        };
    }, [databases]);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const formatDate = (timestamp: string): string => {
        try {
            const time = parseFloat(timestamp);
            if (!isNaN(time) && time > 0) {
                const date = new Date(time * 1000);
                return date.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }
            return 'Unknown';
        } catch {
            return 'Unknown';
        }
    };

    const StatCard = ({icon: Icon, title, value, subtitle, colorClass = 'blue'}: {
        icon: any;
        title: string;
        value: string | number;
        subtitle?: string;
        colorClass?: string;
    }) => {
        const getColorClasses = (color: string) => {
            switch (color) {
                case 'green':
                    return {bg: 'bg-green-50', text: 'text-green-600'};
                case 'purple':
                    return {bg: 'bg-purple-50', text: 'text-purple-600'};
                case 'orange':
                    return {bg: 'bg-orange-50', text: 'text-orange-600'};
                default:
                    return {bg: 'bg-blue-50', text: 'text-blue-600'};
            }
        };

        const colors = getColorClasses(colorClass);

        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 ${colors.bg} rounded-xl`}>
                        <Icon className={`h-6 w-6 ${colors.text}`}/>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{value}</div>
                        {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
                    </div>
                </div>
                <h3 className="text-sm font-medium text-gray-700">{title}</h3>
            </div>
        );
    };

    const hasData = databases.length > 0;

    return (
        <div className="h-full bg-gray-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6 p-6">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl">
                            <BarChart3 className="h-8 w-8 text-white"/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
                            <p className="text-gray-600">WeChat 数据库统计和分析</p>
                        </div>
                    </div>
                </div>

                {!hasData ? (
                    // 无数据状态
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <div className="text-center">
                            <div
                                className="p-6 bg-blue-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                                <Database className="h-12 w-12 text-blue-500"/>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-3">开始使用</h2>
                            <p className="text-gray-600 text-sm leading-relaxed mb-6">
                                请先在设置页面加载数据库文件，然后返回查看统计信息
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
                                <p className="text-sm text-blue-800">
                                    💡 提示: 前往设置页面选择你的 keys.toml 文件
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // 有数据时显示统计信息
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                icon={Database}
                                title="数据库总数"
                                value={stats.totalDatabases}
                                colorClass="blue"
                            />
                            <StatCard
                                icon={Layers}
                                title="可访问数据库"
                                value={stats.accessibleDatabases}
                                subtitle={`${stats.accessibilityRate.toFixed(1)}% 可用`}
                                colorClass="green"
                            />
                            <StatCard
                                icon={HardDrive}
                                title="总存储大小"
                                value={formatFileSize(stats.totalSize)}
                                colorClass="purple"
                            />
                            <StatCard
                                icon={PieChart}
                                title="数据库类型"
                                value={Object.keys(stats.typeGroups).length}
                                subtitle="种类型"
                                colorClass="orange"
                            />
                        </div>

                        {/* 数据库类型分布和最近修改 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Database Types */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <PieChart className="h-5 w-5 text-purple-600"/>
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">数据库类型分布</h2>
                                </div>
                                <div className="space-y-4">
                                    {Object.entries(stats.typeGroups)
                                        .sort(([, a], [, b]) => b.count - a.count)
                                        .map(([type, data]) => (
                                            <div key={type}
                                                 className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                                    <div>
                            <span className="font-medium text-gray-900">
                              {DB_TYPE_LABELS[type] || type}
                            </span>
                                                        <div className="text-sm text-gray-600">
                                                            {data.accessible}/{data.count} 可访问
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-gray-900">{data.count}</div>
                                                    <div
                                                        className="text-sm text-gray-600">{formatFileSize(data.size)}</div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Recent Databases */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-green-50 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-green-600"/>
                                    </div>
                                    <h2 className="text-lg font-semibold text-gray-900">最近修改</h2>
                                </div>
                                <div className="space-y-4">
                                    {stats.recentDatabases.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300"/>
                                            <p className="text-sm">暂无时间信息</p>
                                        </div>
                                    ) : (
                                        stats.recentDatabases.map((db, index) => (
                                            <div key={db.id}
                                                 className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50">
                                                <div
                                                    className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                                                    <span className="text-white text-xs font-medium">{index + 1}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-900 truncate">
                                                        {db.filename}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {DB_TYPE_LABELS[db.db_type] || db.db_type}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatDate(db.last_modified!)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatFileSize(db.size || 0)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <Database className="h-6 w-6 text-blue-600 mb-2"/>
                            <h3 className="font-medium text-gray-900 mb-1">数据库管理</h3>
                            <p className="text-sm text-gray-600">查看和管理所有数据库表格</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <MessageSquare className="h-6 w-6 text-purple-600 mb-2"/>
                            <h3 className="font-medium text-gray-900 mb-1">聊天记录</h3>
                            <p className="text-sm text-gray-600">浏览微信聊天历史记录</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <Settings className="h-6 w-6 text-green-600 mb-2"/>
                            <h3 className="font-medium text-gray-900 mb-1">设置配置</h3>
                            <p className="text-sm text-gray-600">管理应用设置和偏好</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}