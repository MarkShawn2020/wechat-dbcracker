import React, { useState } from 'react';
import { useAtom } from 'jotai';
import { databasesAtom } from '../store/atoms';
import { ChatDataService } from '../services/chatDataService';
import { ContactParser } from '../utils/contactParser';
import { MessageParser } from '../utils/messageParser';
import { WeChatTableMatcher } from '../utils/wechatTableMatcher';
import { dbManager } from '../api';
import { Play, CheckCircle, XCircle, AlertCircle, Copy } from 'lucide-react';

interface MatchTestResult {
  contactId: string;
  contactName: string;
  originalId?: string;
  username?: string;
  messagesFound: number;
  sampleMessages: Array<{
    sender: string;
    receiver?: string;
    content: string;
    timestamp: string;
  }>;
  matchedBy: string[];
}

export function ContactMessageMatcher() {
  const [databases] = useAtom(databasesAtom);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<MatchTestResult[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');

  const contactDb = databases.find(db => db.db_type === 'Contact');
  const messageDbs = databases.filter(db => db.db_type === 'Message');

  const runMatchTest = async () => {
    if (!contactDb || messageDbs.length === 0) return;

    setIsRunning(true);
    setTestResults([]);

    try {
      // 加载联系人
      const contacts = await ChatDataService.loadContacts(contactDb);
      console.log(`加载了 ${contacts.length} 个联系人`);

      const results: MatchTestResult[] = [];

      // 测试前20个联系人的匹配情况
      const testContacts = contacts.slice(0, 20);

      for (const contact of testContacts) {
        const result: MatchTestResult = {
          contactId: contact.id,
          contactName: contact.displayName,
          originalId: contact.originalId,
          username: contact.username,
          messagesFound: 0,
          sampleMessages: [],
          matchedBy: []
        };

        // 为每个联系人加载消息
        try {
          const messages = await ChatDataService.loadMessages(contact, messageDbs, contacts);
          result.messagesFound = messages.length;
          
          // 取前5条消息作为样本
          result.sampleMessages = messages.slice(0, 5).map(msg => ({
            sender: msg.senderId,
            receiver: msg.receiverId,
            content: msg.content.substring(0, 100),
            timestamp: msg.timestamp
          }));

          // 分析匹配方式
          if (messages.length > 0) {
            const identifiers = [contact.originalId, contact.username].filter(Boolean);
            const matchedIds = new Set<string>();

            messages.forEach(msg => {
              identifiers.forEach(id => {
                if (msg.senderId === id || msg.receiverId === id) {
                  matchedIds.add(`精确匹配: ${id}`);
                } else if (msg.senderId.includes(id!) || (msg.receiverId && msg.receiverId.includes(id!))) {
                  matchedIds.add(`包含匹配: ${id}`);
                }
              });
            });

            result.matchedBy = Array.from(matchedIds);
          }

        } catch (err) {
          console.warn(`联系人 ${contact.displayName} 消息加载失败:`, err);
        }

        results.push(result);
        setTestResults([...results]); // 实时更新结果
      }

    } catch (err) {
      console.error('匹配测试失败:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const testSpecificContact = async (contactId: string) => {
    if (!contactDb || messageDbs.length === 0 || !contactId) return;

    setIsRunning(true);

    try {
      const contacts = await ChatDataService.loadContacts(contactDb);
      const contact = contacts.find(c => c.id === contactId || c.originalId === contactId || c.username === contactId);

      if (!contact) {
        alert('未找到指定联系人');
        return;
      }

      // 详细的匹配测试
      console.log('=== 详细匹配测试 ===');
      console.log('联系人信息:', {
        id: contact.id,
        originalId: contact.originalId,
        username: contact.username,
        displayName: contact.displayName
      });

      // 手动测试每个消息数据库
      for (const messageDb of messageDbs) {
        console.log(`\n--- 测试数据库: ${messageDb.filename} ---`);
        
        await dbManager.connectDatabase(messageDb.id);
        
        const tables = await dbManager.getTables(messageDb.id);
        
        // 使用专业的微信表匹配器查找聊天表
        const chatTables = WeChatTableMatcher.findChatTables(tables);
        
        // 检查是否是微信数据库
        const isWeChatDb = await WeChatTableMatcher.isWeChatDatabase(messageDb.id, tables, dbManager);
        
        console.log(`匹配测试 - 数据库 ${messageDb.filename} 是否为微信数据库: ${isWeChatDb}`);
        console.log(`匹配测试 - 数据库 ${messageDb.filename} 中找到的聊天表:`, chatTables.map(t => t.name));
        console.log(`匹配测试 - 所有表:`, tables.map(t => t.name));
        
        // 优先使用最常见的聊天表
        const messageTable = chatTables.find(t => t.name.toLowerCase().startsWith('chat_')) || chatTables[0];

        // 测试所有找到的 chat 表
        for (const chatTable of chatTables) {
          console.log(`\n=== 测试聊天表: ${chatTable.name} ===`);
          
          const identifiers = [contact.originalId, contact.username].filter(Boolean);
          console.log('查找标识符:', identifiers);

          // 首先看看表结构
          try {
            const sampleData = await dbManager.queryTable(messageDb.id, chatTable.name, 5);
            console.log(`表 ${chatTable.name} 的字段:`, sampleData.columns);
            if (sampleData.rows.length > 0) {
              console.log(`表 ${chatTable.name} 的样本数据:`, sampleData.rows[0]);
            }
          } catch (err) {
            console.log(`读取表 ${chatTable.name} 失败:`, err);
            continue;
          }

          // 尝试不同的查询方式
          for (const identifier of identifiers) {
            const queries = [
              `SELECT * FROM ${chatTable.name} WHERE talker = '${identifier}' LIMIT 5`,
              `SELECT * FROM ${chatTable.name} WHERE sender = '${identifier}' LIMIT 5`,
              `SELECT * FROM ${chatTable.name} WHERE fromuser = '${identifier}' LIMIT 5`,
              `SELECT * FROM ${chatTable.name} WHERE talker LIKE '%${identifier}%' LIMIT 5`,
              `SELECT COUNT(*) FROM ${chatTable.name} WHERE talker = '${identifier}'`,
            ];

            for (const query of queries) {
              try {
                const result = await dbManager.executeQuery(messageDb.id, query);
                if (result.rows.length > 0 && result.rows[0] && result.rows[0][0] !== 0) {
                  console.log(`✓ 查询成功: ${query}`);
                  console.log(`  找到 ${result.rows.length} 条记录`);
                  console.log('  样本数据:', result.rows[0]);
                } else {
                  console.log(`✗ 无结果: ${query}`);
                }
              } catch (err) {
                console.log(`✗ 查询失败: ${query} - ${err}`);
              }
            }
          }
        }
      }

    } catch (err) {
      console.error('特定联系人测试失败:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">联系人消息匹配测试</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={runMatchTest}
              disabled={isRunning || !contactDb || messageDbs.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>批量测试匹配 (前20个联系人)</span>
            </button>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                placeholder="输入联系人ID进行详细测试"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => testSpecificContact(selectedContactId)}
                disabled={isRunning || !selectedContactId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                详细测试
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>当前状态: 联系人数据库 {contactDb ? '✓' : '✗'} | 消息数据库 {messageDbs.length} 个</p>
          </div>
        </div>
      </div>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">匹配测试结果</h4>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={result.contactId} className="border-b border-gray-100 last:border-b-0 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-900">{result.contactName}</span>
                    {result.messagesFound > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm text-gray-600">
                      {result.messagesFound} 条消息
                    </span>
                  </div>
                  <button
                    onClick={() => testSpecificContact(result.contactId)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    详细测试
                  </button>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <div>ID: {result.contactId}</div>
                  {result.originalId && <div>原始ID: {result.originalId}</div>}
                  {result.username && <div>用户名: {result.username}</div>}
                  
                  {result.matchedBy.length > 0 && (
                    <div>匹配方式: {result.matchedBy.join(', ')}</div>
                  )}

                  {result.sampleMessages.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">样本消息:</div>
                      {result.sampleMessages.slice(0, 2).map((msg, idx) => (
                        <div key={idx} className="ml-2 text-xs bg-gray-50 rounded p-1 mt-1">
                          <div>发送者: {msg.sender}</div>
                          {msg.receiver && <div>接收者: {msg.receiver}</div>}
                          <div>内容: {msg.content}...</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isRunning && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>测试进行中...</span>
          </div>
        </div>
      )}
    </div>
  );
}