import {useMemo, useState} from 'react';
import {useAtom} from 'jotai';
import {databasesAtom, loadingAtom} from '../store/atoms';
import {DB_TYPE_COLORS, DB_TYPE_LABELS} from '../types';
import {
    AlertCircle,
    BarChart3,
    Calendar,
    CheckCircle,
    Clock,
    Database,
    Globe,
    HardDrive,
    Heart,
    Image,
    Info,
    Key,
    MessageSquare,
    Network,
    PieChart,
    Radio,
    Search,
    Share2,
    Sticker,
    TrendingUp,
    Users
} from 'lucide-react';

interface DatabaseStats {
    totalDatabases: number;
    totalSize: number;
    accessibleCount: number;
    typeDistribution: Record<string, number>;
    sizeDistribution: Record<string, number>;
    lastModified: string;
}

interface DatabaseRelationship {
    from: string;
    to: string;
    type: 'reference' | 'index' | 'media' | 'search';
    description: string;
}

const DB_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    'Message': MessageSquare,
    'Contact': Users,
    'Group': Users,
    'mediaData': Image,
    'fts': Search,
    'ftsfile': Search,
    'Favorites': Heart,
    'Sns': Share2,
    'KeyValue': Key,
    'WebTemplate': Globe,
    'MMLive': Radio,
    'Stickers': Sticker,
    'Session': MessageSquare,
    'brand': MessageSquare,
    'Sync': Database,
    'Account': Users,
    'unknown': Database
};

const DATABASE_RELATIONSHIPS: DatabaseRelationship[] = [
    {
        from: 'Message',
        to: 'Contact',
        type: 'reference',
        description: 'Messages reference contacts via user IDs'
    },
    {
        from: 'Message',
        to: 'Group',
        type: 'reference',
        description: 'Group messages link to group database'
    },
    {
        from: 'Message',
        to: 'mediaData',
        type: 'media',
        description: 'Media references stored in mediaData.db'
    },
    {
        from: 'fts',
        to: 'Message',
        type: 'index',
        description: 'Full-text search indexes message content'
    },
    {
        from: 'ftsfile',
        to: 'mediaData',
        type: 'index',
        description: 'File search indexes media data'
    },
    {
        from: 'Session',
        to: 'Contact',
        type: 'reference',
        description: 'Sessions track conversation participants'
    },
    {
        from: 'Session',
        to: 'Group',
        type: 'reference',
        description: 'Sessions include group conversations'
    },
    {
        from: 'Favorites',
        to: 'Message',
        type: 'reference',
        description: 'Favorites reference original messages'
    },
    {
        from: 'Sns',
        to: 'Contact',
        type: 'reference',
        description: 'WeChat Moments posts linked to contacts'
    }
];

export function Overview() {
    const [databases] = useAtom(databasesAtom);
    const [loading] = useAtom(loadingAtom);
    const [selectedRelation, setSelectedRelation] = useState<DatabaseRelationship | null>(null);

    const stats = useMemo((): DatabaseStats => {
        const totalSize = databases.reduce((sum, db) => sum + (db.size || 0), 0);
        const accessibleCount = databases.filter(db => db.accessible).length;
        const typeDistribution: Record<string, number> = {};
        const sizeDistribution: Record<string, number> = {};

        databases.forEach(db => {
            typeDistribution[db.db_type] = (typeDistribution[db.db_type] || 0) + 1;
            sizeDistribution[db.db_type] = (sizeDistribution[db.db_type] || 0) + (db.size || 0);
        });

        const lastModified = databases
            .filter(db => db.last_modified)
            .sort((a, b) => new Date(b.last_modified!).getTime() - new Date(a.last_modified!).getTime())[0]?.last_modified || '';

        return {
            totalDatabases: databases.length,
            totalSize,
            accessibleCount,
            typeDistribution,
            sizeDistribution,
            lastModified
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

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return 'No date';

        try {
            // First try parsing as Unix timestamp (seconds)
            const timestamp = parseFloat(dateStr);
            if (!isNaN(timestamp) && timestamp > 0) {
                // Unix timestamp in seconds
                const date = new Date(timestamp * 1000);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                }
            }

            // Try parsing as regular date string
            let date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }

            // Try ISO format variations
            const isoDate = new Date(dateStr.replace(/\s/, 'T'));
            if (!isNaN(isoDate.getTime())) {
                return isoDate.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }

            // If all else fails, return raw string (truncated)
            return dateStr.length > 20 ? dateStr.substring(0, 20) + '...' : dateStr;
        } catch (error) {
            return dateStr.length > 20 ? dateStr.substring(0, 20) + '...' : dateStr;
        }
    };

    const formatTime = (dateStr: string): string => {
        if (!dateStr) return 'No time';

        try {
            // First try parsing as Unix timestamp (seconds)
            const timestamp = parseFloat(dateStr);
            if (!isNaN(timestamp) && timestamp > 0) {
                // Unix timestamp in seconds
                const date = new Date(timestamp * 1000);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                }
            }

            // Try parsing as regular date string
            let date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }

            // Try ISO format variations
            const isoDate = new Date(dateStr.replace(/\s/, 'T'));
            if (!isNaN(isoDate.getTime())) {
                return isoDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }

            return '';
        } catch (error) {
            return '';
        }
    };

    const formatDateShort = (dateStr: string): string => {
        if (!dateStr) return 'No date';

        try {
            // First try parsing as Unix timestamp (seconds)
            const timestamp = parseFloat(dateStr);
            if (!isNaN(timestamp) && timestamp > 0) {
                // Unix timestamp in seconds
                const date = new Date(timestamp * 1000);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit'
                    });
                }
            }

            // Try parsing as regular date string
            let date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit'
                });
            }

            // Try ISO format variations
            const isoDate = new Date(dateStr.replace(/\s/, 'T'));
            if (!isNaN(isoDate.getTime())) {
                return isoDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit'
                });
            }

            // If all else fails, return raw string (truncated)
            return dateStr.length > 10 ? dateStr.substring(0, 10) + '...' : dateStr;
        } catch (error) {
            return dateStr.length > 10 ? dateStr.substring(0, 10) + '...' : dateStr;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-slate-600">Loading database overview...</p>
                </div>
            </div>
        );
    }

    if (databases.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="text-center max-w-md">
                    <div
                        className="p-6 bg-slate-100 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                        <Database className="h-16 w-16 text-slate-400"/>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">No Database Data</h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        Load a keys file to view the WeChat database architecture and statistics.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gradient-to-br from-slate-50 to-white overflow-y-auto">
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-blue-600"/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">WeChat Database Overview</h1>
                            <p className="text-slate-600">Architecture analysis and data statistics</p>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Databases</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.totalDatabases}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <Database className="h-6 w-6 text-blue-600"/>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Size</p>
                                <p className="text-2xl font-bold text-slate-900">{formatFileSize(stats.totalSize)}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <HardDrive className="h-6 w-6 text-green-600"/>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Accessible</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.accessibleCount}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <CheckCircle className="h-6 w-6 text-emerald-600"/>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Last Modified</p>
                                <p className="text-sm font-semibold text-slate-900">
                                    {stats.lastModified ? formatDate(stats.lastModified) : 'Unknown'}
                                </p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-lg">
                                <Clock className="h-6 w-6 text-amber-600"/>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Database Types Distribution */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1.5 bg-purple-100 rounded-lg">
                                        <PieChart className="h-4 w-4 text-purple-600"/>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">Database Types</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(stats.typeDistribution).map(([type, count]) => {
                                        const Icon = DB_TYPE_ICONS[type] || Database;
                                        const sizeForType = stats.sizeDistribution[type] || 0;
                                        return (
                                            <div key={type}
                                                 className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                                        <Icon className="h-4 w-4 text-slate-600"/>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">
                                                            {DB_TYPE_LABELS[type] || type}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{formatFileSize(sizeForType)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                          <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${DB_TYPE_COLORS[type] || DB_TYPE_COLORS.unknown}`}>
                            {count}
                          </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Database Status */}
                    <div>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1.5 bg-green-100 rounded-lg">
                                        <TrendingUp className="h-4 w-4 text-green-600"/>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">Status Overview</h3>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="h-4 w-4 text-green-600"/>
                                        <span className="text-sm font-medium text-green-900">Accessible</span>
                                    </div>
                                    <span className="text-sm font-bold text-green-900">{stats.accessibleCount}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <AlertCircle className="h-4 w-4 text-red-600"/>
                                        <span className="text-sm font-medium text-red-900">Inaccessible</span>
                                    </div>
                                    <span
                                        className="text-sm font-bold text-red-900">{stats.totalDatabases - stats.accessibleCount}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">Accessibility Rate</span>
                                        <span className="text-sm font-bold text-slate-900">
                      {((stats.accessibleCount / stats.totalDatabases) * 100).toFixed(1)}%
                    </span>
                                    </div>
                                    <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                            style={{width: `${(stats.accessibleCount / stats.totalDatabases) * 100}%`}}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Database Relationships */}
                <div className="mt-8">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-blue-100 rounded-lg">
                                    <Network className="h-4 w-4 text-blue-600"/>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">Database Relationships</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {DATABASE_RELATIONSHIPS.map((rel, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            selectedRelation === rel
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                        onClick={() => setSelectedRelation(selectedRelation === rel ? null : rel)}
                                    >
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${DB_TYPE_COLORS[rel.from] || DB_TYPE_COLORS.unknown}`}>
                                                {DB_TYPE_LABELS[rel.from] || rel.from}
                                            </div>
                                            <div className="flex-1 flex items-center justify-center">
                                                <div
                                                    className={`h-px flex-1 ${rel.type === 'reference' ? 'bg-blue-300' : rel.type === 'index' ? 'bg-green-300' : 'bg-purple-300'}`}/>
                                                <div
                                                    className={`mx-2 text-xs font-medium ${rel.type === 'reference' ? 'text-blue-600' : rel.type === 'index' ? 'text-green-600' : 'text-purple-600'}`}>
                                                    {rel.type}
                                                </div>
                                                <div
                                                    className={`h-px flex-1 ${rel.type === 'reference' ? 'bg-blue-300' : rel.type === 'index' ? 'bg-green-300' : 'bg-purple-300'}`}/>
                                            </div>
                                            <div
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${DB_TYPE_COLORS[rel.to] || DB_TYPE_COLORS.unknown}`}>
                                                {DB_TYPE_LABELS[rel.to] || rel.to}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-600 text-center">{rel.description}</p>
                                    </div>
                                ))}
                            </div>
                            {selectedRelation && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Info className="h-4 w-4 text-blue-600"/>
                                        <h4 className="font-medium text-blue-900">Relationship Details</h4>
                                    </div>
                                    <p className="text-sm text-blue-800">
                                        <strong>{DB_TYPE_LABELS[selectedRelation.from] || selectedRelation.from}</strong> has
                                        a{' '}
                                        <strong>{selectedRelation.type}</strong> relationship with{' '}
                                        <strong>{DB_TYPE_LABELS[selectedRelation.to] || selectedRelation.to}</strong>
                                    </p>
                                    <p className="text-sm text-blue-700 mt-1">{selectedRelation.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Database Files Details */}
                <div className="mt-8">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1.5 bg-slate-100 rounded-lg">
                                        <Calendar className="h-4 w-4 text-slate-600"/>
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">Database Files</h3>
                                </div>
                                {/* Debug Info */}
                                <div className="text-xs text-slate-500">
                                    Total files: {databases.length}
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-900">Database</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-900">Type</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-900">Size</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-900">Last
                                            Modified
                                        </th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-900">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {databases.map((db, index) => {
                                        const Icon = DB_TYPE_ICONS[db.db_type] || Database;
                                        return (
                                            <tr key={`${db.id}-${index}`}
                                                className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-1.5 bg-slate-100 rounded-lg">
                                                            <Icon className="h-3 w-3 text-slate-600"/>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">{db.filename}</p>
                                                            <p className="text-xs text-slate-500 font-mono truncate max-w-xs"
                                                               title={db.path}>
                                                                {db.path}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                            <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${DB_TYPE_COLORS[db.db_type] || DB_TYPE_COLORS.unknown}`}>
                              {DB_TYPE_LABELS[db.db_type] || db.db_type}
                            </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className="text-sm text-slate-600">{formatFileSize(db.size || 0)}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="space-y-1">
                                                        <div
                                                            className="text-sm text-slate-600">{formatDateShort(db.last_modified || '')}</div>
                                                        <div
                                                            className="text-xs text-slate-400">{formatTime(db.last_modified || '')}</div>
                                                        <div className="text-xs text-slate-300 font-mono">
                                                            {db.last_modified ? `(${db.last_modified})` : '(no data)'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className={`h-2 w-2 rounded-full ${db.accessible ? 'bg-green-500' : 'bg-red-500'}`}/>
                                                        <span
                                                            className={`text-xs font-medium ${db.accessible ? 'text-green-700' : 'text-red-700'}`}>
                                {db.accessible ? 'Accessible' : 'Inaccessible'}
                              </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                                {databases.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500">No database files loaded</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Architecture Description */}
                <div className="mt-8">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-6 border-b border-slate-200">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-amber-100 rounded-lg">
                                    <Info className="h-4 w-4 text-amber-600"/>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">Architecture Overview</h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-slate-900 mb-3">Core Components</h4>
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <p>• <strong>Message Databases</strong>: Sharded storage (msg_0.db to msg_9.db)
                                        </p>
                                        <p>• <strong>Contact System</strong>: User profiles and relationships</p>
                                        <p>• <strong>Group Management</strong>: Group chats and member information</p>
                                        <p>• <strong>Media Storage</strong>: File references and metadata</p>
                                        <p>• <strong>Search Indexes</strong>: Full-text and file search capabilities</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 mb-3">Security Features</h4>
                                    <div className="space-y-2 text-sm text-slate-600">
                                        <p>• <strong>SQLCipher Encryption</strong>: AES-256 database encryption</p>
                                        <p>• <strong>Key Extraction</strong>: DTrace-based key recovery</p>
                                        <p>• <strong>Secure Access</strong>: Runtime key management</p>
                                        <p>• <strong>Data Integrity</strong>: Checksums and validation</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}