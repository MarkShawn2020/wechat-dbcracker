import {BarChart3, Bug, Database, MessageSquare, Search, Settings, Users} from 'lucide-react';

export type NavigationTab = 'chat' | 'contacts' | 'database' | 'overview' | 'diagnostic' | 'settings' | 'chatdebug';

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
            id: 'chatdebug' as const,
            name: '聊天调试',
            icon: Bug,
            description: '调试聊天记录加载问题'
        },
        {
            id: 'database' as const,
            name: '数据库',
            icon: Database,
            description: '管理数据库和表格'
        },
        {
            id: 'diagnostic' as const,
            name: '诊断',
            icon: Search,
            description: '数据库结构诊断和调试'
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
        <div className="bg-white border-t border-gray-200 px-6 py-2">
            <div className="flex justify-center space-x-8">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200 min-w-[80px] ${
                                isActive
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                            title={tab.description}
                        >
                            <Icon className={`h-6 w-6 mb-1 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}/>
                            <span className={`text-xs font-medium ${
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