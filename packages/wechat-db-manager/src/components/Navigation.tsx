import {BarChart3, Database, MessageSquare, Settings, Users, UserCheck} from 'lucide-react';

export type NavigationTab = 'chat' | 'contacts' | 'contacts-pro' | 'database' | 'overview' | 'diagnostic' | 'settings' | 'chatdebug';

interface NavigationProps {
    activeTab: NavigationTab;
    onTabChange: (tab: NavigationTab) => void;
}

export function Navigation({activeTab, onTabChange}: NavigationProps) {
    const tabs = [
        {
            id: 'chat' as const,
            name: '聊天记录',
            icon: MessageSquare,
            description: '查看微信聊天记录'
        },
        {
            id: 'contacts' as const,
            name: '联系人',
            icon: Users,
            description: '查看所有联系人'
        },
        {
            id: 'contacts-pro' as const,
            name: '联系人详情',
            icon: UserCheck,
            description: '三列布局查看联系人和聊天记录'
        },
        {
            id: 'database' as const,
            name: '数据库',
            icon: Database,
            description: '管理数据库和表格'
        },
        {
            id: 'overview' as const,
            name: '概览',
            icon: BarChart3,
            description: '数据统计和分析'
        },
        {
            id: 'settings' as const,
            name: '设置',
            icon: Settings,
            description: '应用配置和偏好'
        }
    ];

    return (
        <div className="bg-white border-t border-gray-200 px-2 py-2">
            <div className="flex justify-center space-x-2 md:space-x-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center py-2 px-2 md:px-3 rounded-lg transition-all duration-200 min-w-[60px] md:min-w-[70px] ${
                                isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                            title={tab.description}
                        >
                            <Icon className={`h-5 w-5 md:h-6 md:w-6 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}/>
                            <span className={`text-xs font-medium truncate max-w-full ${
                                isActive ? 'text-blue-600' : 'text-gray-600'
                            }`}>
                {tab.name}
              </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}