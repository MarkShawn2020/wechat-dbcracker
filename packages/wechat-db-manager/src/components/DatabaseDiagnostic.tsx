import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { databasesAtom } from '../store/atoms';
import { dbManager } from '../api';
import { WeChatTableMatcher } from '../utils/wechatTableMatcher';
import { Database, Search, Table, Code, AlertCircle, CheckCircle, Copy } from 'lucide-react';

interface TableInfo {
  name: string;
  type: string;
  sql?: string;
}

interface TableData {
  columns: string[];
  rows: any[][];
  rowCount: number;
}

interface DiagnosticResult {
  dbId: string;
  dbName: string;
  connected: boolean;
  tables: TableInfo[];
  contactTable?: {
    name: string;
    data: TableData;
    analysis: {
      totalContacts: number;
      sampleIds: string[];
      fieldMapping: Record<string, string>;
    };
  };
  messageTables: Array<{
    name: string;
    data: TableData;
    analysis: {
      totalMessages: number;
      sampleSenders: string[];
      sampleReceivers: string[];
      fieldMapping: Record<string, string>;
      timeRange?: { earliest: string; latest: string };
    };
  }>;
  errors: string[];
}

export function DatabaseDiagnostic() {
  const [databases] = useAtom(databasesAtom);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDb, setSelectedDb] = useState<string>('');

  const runDiagnostic = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    for (const db of databases) {
      const result: DiagnosticResult = {
        dbId: db.id,
        dbName: db.filename,
        connected: false,
        tables: [],
        messageTables: [],
        errors: []
      };

      try {
        // 连接数据库
        await dbManager.connectDatabase(db.id);
        result.connected = true;

        // 获取所有表
        const tables = await dbManager.getTables(db.id);
        result.tables = tables;

        // 分析联系人表
        const contactTable = tables.find(t =>
          t.name.toLowerCase().includes('contact') ||
          t.name.toLowerCase().includes('wccontact')
        );

        if (contactTable) {
          try {
            const contactData = await dbManager.queryTable(db.id, contactTable.name, 50);
            result.contactTable = {
              name: contactTable.name,
              data: contactData,
              analysis: analyzeContactTable(contactData)
            };
          } catch (err) {
            result.errors.push(`联系人表分析失败: ${err}`);
          }
        }

        // 分析消息表 - 使用专业的微信表匹配器
        const chatTables = WeChatTableMatcher.findChatTables(tables);
        
        // 检查是否是微信数据库
        const isWeChatDb = await WeChatTableMatcher.isWeChatDatabase(db.id, tables, dbManager);
        
        console.log(`诊断 - 数据库 ${db.filename} 是否为微信数据库: ${isWeChatDb}`);
        console.log(`诊断 - 数据库 ${db.filename} 中找到的聊天表:`, chatTables.map(t => t.name));
        
        const messageTables = chatTables;

        for (const messageTable of messageTables) {
          try {
            const messageData = await dbManager.queryTable(db.id, messageTable.name, 100);
            result.messageTables.push({
              name: messageTable.name,
              data: messageData,
              analysis: analyzeMessageTable(messageData)
            });
          } catch (err) {
            result.errors.push(`消息表 ${messageTable.name} 分析失败: ${err}`);
          }
        }

      } catch (err) {
        result.errors.push(`数据库连接失败: ${err}`);
      }

      results.push(result);
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  const analyzeContactTable = (data: TableData) => {
    const analysis = {
      totalContacts: data.rows.length,
      sampleIds: [] as string[],
      fieldMapping: {} as Record<string, string>
    };

    // 字段映射分析
    const fieldPatterns = {
      'ID字段': ['id', 'contactid', 'contact_id', 'username', 'wxid', 'userid'],
      '显示名': ['displayname', 'nickname', 'remark', 'name'],
      '用户名': ['username', 'user_name', 'wxid', 'wx_id'],
      '备注': ['remark', 'remarkname', 'remark_name'],
      '昵称': ['nickname', 'nick_name']
    };

    Object.entries(fieldPatterns).forEach(([category, patterns]) => {
      for (const pattern of patterns) {
        const index = data.columns.findIndex(col =>
          col.toLowerCase().includes(pattern.toLowerCase())
        );
        if (index !== -1) {
          analysis.fieldMapping[category] = `${data.columns[index]} (索引 ${index})`;
          break;
        }
      }
    });

    // 提取样本ID
    const idColumns = data.columns
      .map((col, idx) => ({ col, idx }))
      .filter(({ col }) => 
        ['id', 'contactid', 'username', 'wxid'].some(pattern =>
          col.toLowerCase().includes(pattern)
        )
      );

    analysis.sampleIds = data.rows.slice(0, 10).map(row => {
      const ids = idColumns.map(({ idx }) => row[idx]).filter(Boolean);
      return ids.join(' | ');
    }).filter(Boolean);

    return analysis;
  };

  const analyzeMessageTable = (data: TableData) => {
    const analysis = {
      totalMessages: data.rows.length,
      sampleSenders: [] as string[],
      sampleReceivers: [] as string[],
      fieldMapping: {} as Record<string, string>,
      timeRange: undefined as { earliest: string; latest: string } | undefined
    };

    // 字段映射分析
    const fieldPatterns = {
      '发送者': ['sender', 'from', 'talker', 'fromuser', 'from_user'],
      '接收者': ['receiver', 'to', 'touser', 'to_user'],
      '内容': ['content', 'message', 'msg', 'text'],
      '时间戳': ['timestamp', 'time', 'createtime', 'create_time', 'msgtime'],
      '消息类型': ['type', 'msgtype', 'msg_type', 'messagetype']
    };

    Object.entries(fieldPatterns).forEach(([category, patterns]) => {
      for (const pattern of patterns) {
        const index = data.columns.findIndex(col =>
          col.toLowerCase().includes(pattern.toLowerCase())
        );
        if (index !== -1) {
          analysis.fieldMapping[category] = `${data.columns[index]} (索引 ${index})`;
          break;
        }
      }
    });

    // 提取样本发送者和接收者
    const senderColumns = data.columns
      .map((col, idx) => ({ col, idx }))
      .filter(({ col }) => 
        ['sender', 'from', 'talker', 'fromuser'].some(pattern =>
          col.toLowerCase().includes(pattern)
        )
      );

    const receiverColumns = data.columns
      .map((col, idx) => ({ col, idx }))
      .filter(({ col }) => 
        ['receiver', 'to', 'touser'].some(pattern =>
          col.toLowerCase().includes(pattern)
        )
      );

    analysis.sampleSenders = data.rows.slice(0, 20).map(row => {
      const senders = senderColumns.map(({ idx }) => row[idx]).filter(Boolean);
      return senders.join(' | ');
    }).filter(Boolean);

    analysis.sampleReceivers = data.rows.slice(0, 20).map(row => {
      const receivers = receiverColumns.map(({ idx }) => row[idx]).filter(Boolean);
      return receivers.join(' | ');
    }).filter(Boolean);

    // 时间范围分析
    const timeColumns = data.columns
      .map((col, idx) => ({ col, idx }))
      .filter(({ col }) => 
        ['timestamp', 'time', 'createtime'].some(pattern =>
          col.toLowerCase().includes(pattern)
        )
      );

    if (timeColumns.length > 0) {
      const times = data.rows
        .map(row => timeColumns.map(({ idx }) => row[idx]))
        .flat()
        .filter(Boolean)
        .map(t => String(t))
        .sort();

      if (times.length > 0) {
        analysis.timeRange = {
          earliest: times[0],
          latest: times[times.length - 1]
        };
      }
    }

    return analysis;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">数据库诊断工具</h2>
        <button
          onClick={runDiagnostic}
          disabled={isRunning || databases.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>诊断中...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>开始诊断</span>
            </>
          )}
        </button>
      </div>

      {databases.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>请先加载数据库文件</p>
        </div>
      )}

      {diagnostics.map((result) => (
        <div key={result.dbId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>{result.dbName}</span>
                {result.connected ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </h3>
              <span className="text-sm text-gray-500">
                {result.tables.length} 个表
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 错误信息 */}
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">错误信息</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {result.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 所有表列表 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                <Table className="h-4 w-4" />
                <span>数据库表结构</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {result.tables.map((table) => (
                  <div key={table.name} className="bg-gray-50 rounded px-3 py-2 text-sm">
                    <div className="font-medium text-gray-900">{table.name}</div>
                    <div className="text-xs text-gray-500">{table.type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 联系人表分析 */}
            {result.contactTable && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3">
                  联系人表分析: {result.contactTable.name}
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">总联系人数:</span> {result.contactTable.analysis.totalContacts}
                  </div>
                  
                  <div>
                    <span className="font-medium">字段映射:</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(result.contactTable.analysis.fieldMapping).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-blue-700">{key}:</span>
                          <span className="font-mono text-xs">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium">样本联系人ID:</span>
                    <div className="mt-1 bg-white rounded border p-2 max-h-32 overflow-y-auto">
                      {result.contactTable.analysis.sampleIds.slice(0, 10).map((id, idx) => (
                        <div key={idx} className="font-mono text-xs py-1 border-b border-gray-100 last:border-b-0 flex items-center justify-between">
                          <span>{id}</span>
                          <button
                            onClick={() => copyToClipboard(id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 消息表分析 */}
            {result.messageTables.map((messageTable) => (
              <div key={messageTable.name} className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3">
                  消息表分析: {messageTable.name}
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">总消息数:</span> {messageTable.analysis.totalMessages}
                  </div>

                  {messageTable.analysis.timeRange && (
                    <div>
                      <span className="font-medium">时间范围:</span>
                      <div className="mt-1 font-mono text-xs">
                        {messageTable.analysis.timeRange.earliest} ~ {messageTable.analysis.timeRange.latest}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium">字段映射:</span>
                    <div className="mt-1 space-y-1">
                      {Object.entries(messageTable.analysis.fieldMapping).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-green-700">{key}:</span>
                          <span className="font-mono text-xs">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">样本发送者:</span>
                      <div className="mt-1 bg-white rounded border p-2 max-h-32 overflow-y-auto">
                        {[...new Set(messageTable.analysis.sampleSenders)].slice(0, 10).map((sender, idx) => (
                          <div key={idx} className="font-mono text-xs py-1 border-b border-gray-100 last:border-b-0 flex items-center justify-between">
                            <span className="truncate">{sender}</span>
                            <button
                              onClick={() => copyToClipboard(sender)}
                              className="text-gray-400 hover:text-gray-600 ml-2"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium">样本接收者:</span>
                      <div className="mt-1 bg-white rounded border p-2 max-h-32 overflow-y-auto">
                        {[...new Set(messageTable.analysis.sampleReceivers)].slice(0, 10).map((receiver, idx) => (
                          <div key={idx} className="font-mono text-xs py-1 border-b border-gray-100 last:border-b-0 flex items-center justify-between">
                            <span className="truncate">{receiver}</span>
                            <button
                              onClick={() => copyToClipboard(receiver)}
                              className="text-gray-400 hover:text-gray-600 ml-2"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}