import {BarChart3} from 'lucide-react';

export function OverviewPage() {
    return (
        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
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

                {/* 简单内容 */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-3">概览页面正常工作</h2>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6">
                            这是一个简化的概览页面，用于测试功能是否正常
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-md mx-auto">
                            <p className="text-sm text-green-800">
                                ✅ 页面加载成功
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}