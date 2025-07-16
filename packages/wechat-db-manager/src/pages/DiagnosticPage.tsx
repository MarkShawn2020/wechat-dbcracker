import React from 'react';
import { DatabaseDiagnostic } from '../components/DatabaseDiagnostic';
import { ContactMessageMatcher } from '../components/ContactMessageMatcher';
import { LatestMessagesViewer } from '../components/LatestMessagesViewer';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

export function DiagnosticPage() {
  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 页面头部 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数据库诊断</h1>
            <p className="text-gray-600 text-sm mt-1">分析数据库结构，诊断消息显示问题</p>
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="flex-shrink-0 bg-blue-50 border-b border-blue-200 px-6 py-3">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">使用说明：</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>🚀 第一步</strong>：点击"获取所有表的最新消息"直接查看聊天数据</li>
              <li><strong>🔍 第二步</strong>：观察talker ID格式，复制样本用于匹配测试</li>
              <li><strong>⚡ 第三步</strong>：使用"联系人消息匹配测试"验证ID匹配</li>
              <li><strong>🛠️ 第四步</strong>：点击"开始诊断"分析数据库完整结构</li>
              <li><strong>📋 第五步</strong>：查看浏览器控制台获取详细日志信息</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 优化说明 */}
      <div className="flex-shrink-0 bg-green-50 border-b border-green-200 px-6 py-3">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">✅ 已修正表查找逻辑：</p>
            <p className="text-green-700">
              现在精确查找微信的 <code className="bg-green-100 px-1 rounded font-mono">chat_xxx</code> 表，
              并验证表结构确保包含必要的聊天字段（talker, timestamp, content等）。
              如果仍然无法显示消息，请检查控制台日志中的详细匹配信息。
            </p>
          </div>
        </div>
      </div>

      {/* 警告信息 */}
      <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-3">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">注意事项：</p>
            <p className="text-amber-700">
              此工具会读取数据库内容进行分析，请确保数据库文件已正确解密且有读取权限。
              诊断过程可能需要几分钟时间，请耐心等待。
            </p>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          <LatestMessagesViewer />
          <ContactMessageMatcher />
          <DatabaseDiagnostic />
        </div>
      </div>
    </div>
  );
}