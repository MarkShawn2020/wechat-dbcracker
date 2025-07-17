import React, {useState} from 'react';
import {useAtom} from 'jotai';
import {databasesAtom} from '../store/atoms';
import {WeChatTableMatcher} from '../utils/wechatTableMatcher';
import {dbManager} from '../api';
import {ArrowDown, Clock, Copy, Database, Play, User} from 'lucide-react';

interface LatestMessage {
    dbName: string;
    tableName: string;
    talker: string;
    content: string;
    timestamp: string;
    timestampNum: number;
    sender?: string;
    receiver?: string;
    msgType?: string;
}

export function LatestMessagesViewer() {
    const [databases] = useAtom(databasesAtom);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<LatestMessage[]>([]);
    const [error, setError] = useState<string>('');

    const messageDbs = databases.filter(db => db.db_type === 'Message');

    const fetchLatestMessages = async () => {
        setIsLoading(true);
        setError('');
        setMessages([]);

        try {
            const allMessages: LatestMessage[] = [];

            for (const messageDb of messageDbs) {
                console.log(`\n=== 处理数据库: ${messageDb.filename} ===`);

                try {
                    await dbManager.connectDatabase(messageDb.id);
                    const tables = await dbManager.getTables(messageDb.id);
                    const chatTables = WeChatTableMatcher.findChatTables(tables);

                    console.log(`找到 ${chatTables.length} 个聊天表:`, chatTables.map(t => t.name));

                    for (const chatTable of chatTables) {
                        console.log(`\n--- 查询表: ${chatTable.name} ---`);

                        try {
                            // 先查表结构，了解真实字段名
                            const structureResult = await dbManager.queryTable(messageDb.id, chatTable.name, 5);
                            console.log(`表 ${chatTable.name} 的字段:`, structureResult.columns);

                            if (structureResult.rows.length > 0) {
                                console.log(`表 ${chatTable.name} 样本数据:`, structureResult.rows[0]);
                            }

                            // 动态识别字段
                            const columns = structureResult.columns.map(col => col.toLowerCase());

                            // 查找联系人标识字段
                            const contactFields = ['talker', 'username', 'fromuser', 'touser', 'sender', 'userid', 'wxid'];
                            const contactField = contactFields.find(field => columns.includes(field)) ||
                                structureResult.columns.find(col =>
                                    contactFields.some(field => col.toLowerCase().includes(field))
                                );

                            // 查找内容字段
                            const contentFields = ['content', 'message', 'msg', 'text'];
                            const contentField = contentFields.find(field => columns.includes(field)) ||
                                structureResult.columns.find(col =>
                                    contentFields.some(field => col.toLowerCase().includes(field))
                                );

                            // 查找时间字段
                            const timeFields = ['timestamp', 'createtime', 'time', 'msgtime', 'sendtime'];
                            const timeField1 = timeFields.find(field => columns.includes(field)) ||
                                structureResult.columns.find(col =>
                                    timeFields.some(field => col.toLowerCase().includes(field))
                                );
                            const timeField2 = timeFields.filter(field => columns.includes(field))[1] ||
                                structureResult.columns.filter(col =>
                                    timeFields.some(field => col.toLowerCase().includes(field))
                                )[1];

                            console.log(`字段映射 - 联系人: ${contactField}, 内容: ${contentField}, 时间: ${timeField1}, ${timeField2}`);

                            if (!contactField || !contentField || !timeField1) {
                                console.warn(`表 ${chatTable.name} 缺少必要字段，跳过`);
                                console.log(`所有字段:`, structureResult.columns);
                                continue;
                            }

                            // 构建动态查询
                            const query = `
                SELECT ${contactField}, ${contentField}, ${timeField1}${timeField2 ? `, ${timeField2}` : ''}
                FROM ${chatTable.name} 
                WHERE ${contactField} IS NOT NULL AND ${contactField} != ''
                ORDER BY ${timeField1} DESC${timeField2 ? `, ${timeField2} DESC` : ''}
                LIMIT 20
              `;

                            console.log(`执行查询:`, query);
                            const result = await dbManager.executeQuery(messageDb.id, query);
                            console.log(`表 ${chatTable.name} 查询到 ${result.rows.length} 条记录`);

                            if (result.rows.length > 0) {
                                console.log(`查询结果样本:`, result.rows[0]);

                                // 按联系人分组，每个联系人只取最新的一条
                                const contactMessages = new Map<string, LatestMessage>();

                                result.rows.forEach((row, index) => {
                                    const talker = String(row[0] || '').trim();
                                    const content = String(row[1] || '').trim();
                                    const timestamp = row[2] || row[3] || Date.now();

                                    if (talker && content && content !== '空') {
                                        const timestampNum = typeof timestamp === 'number' ? timestamp : parseInt(String(timestamp)) || Date.now();

                                        const message: LatestMessage = {
                                            dbName: messageDb.filename,
                                            tableName: chatTable.name,
                                            talker,
                                            content: content.substring(0, 100), // 限制内容长度
                                            timestamp: new Date(timestampNum * (timestampNum > 9999999999 ? 1 : 1000)).toISOString(),
                                            timestampNum,
                                            sender: contactField !== 'talker' ? talker : undefined,
                                            receiver: undefined,
                                            msgType: undefined
                                        };

                                        // 只保留每个联系人的最新消息
                                        const existing = contactMessages.get(talker);
                                        if (!existing || timestampNum > existing.timestampNum) {
                                            contactMessages.set(talker, message);
                                        }
                                    }
                                });

                                // 添加到总列表
                                allMessages.push(...Array.from(contactMessages.values()));
                                console.log(`表 ${chatTable.name} 提取了 ${contactMessages.size} 个不同联系人的最新消息`);
                            }

                        } catch (tableErr) {
                            console.warn(`查询表 ${chatTable.name} 失败:`, tableErr);
                        }
                    }

                } catch (dbErr) {
                    console.error(`处理数据库 ${messageDb.filename} 失败:`, dbErr);
                }
            }

            // 归并排序：按时间戳倒序
            allMessages.sort((a, b) => b.timestampNum - a.timestampNum);

            console.log(`\n=== 总结果 ===`);
            console.log(`总共找到 ${allMessages.length} 条最新消息`);
            console.log(`不同talker数量: ${new Set(allMessages.map(m => m.talker)).size}`);

            setMessages(allMessages);

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '获取最新消息失败';
            setError(errorMsg);
            console.error('获取最新消息失败:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffDays > 1) {
                return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (diffHours > 1) {
                return Math.floor(diffHours) + '小时前';
            } else {
                return Math.floor(diffMs / (1000 * 60)) + '分钟前';
            }
        } catch {
            return timestamp;
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const uniqueTalkers = new Set(messages.map(m => m.talker)).size;
    const totalTables = messages.reduce((acc, m) => {
        acc.add(`${m.dbName}/${m.tableName}`);
        return acc;
    }, new Set()).size;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    最新消息查看器 - 直接验证聊天表数据
                </h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={fetchLatestMessages}
                            disabled={isLoading || messageDbs.length === 0}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                        >
                            <Play className="h-4 w-4"/>
                            <span>{isLoading ? '查询中...' : '获取所有表的最新消息'}</span>
                        </button>

                        <div className="text-sm text-gray-600">
                            <span>消息数据库: {messageDbs.length} 个</span>
                        </div>
                    </div>

                    {messages.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-blue-600"/>
                                    <span>不同联系人: <strong>{uniqueTalkers}</strong></span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Database className="h-4 w-4 text-blue-600"/>
                                    <span>聊天表: <strong>{totalTables}</strong></span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-blue-600"/>
                                    <span>总消息: <strong>{messages.length}</strong></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* 消息列表 */}
            {messages.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <ArrowDown className="h-5 w-5"/>
                            <span>最新消息列表（按时间倒序）</span>
                        </h4>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {messages.slice(0, 50).map((message, index) => (
                            <div key={`${message.dbName}-${message.tableName}-${message.talker}-${index}`}
                                 className="border-b border-gray-100 last:border-b-0 p-4 hover:bg-gray-50">

                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900 truncate">
                        {message.talker}
                      </span>
                                            <button
                                                onClick={() => copyToClipboard(message.talker)}
                                                className="text-gray-400 hover:text-gray-600"
                                                title="复制talker ID"
                                            >
                                                <Copy className="h-3 w-3"/>
                                            </button>
                                            <span className="text-sm text-gray-500">
                        {formatTime(message.timestamp)}
                      </span>
                                        </div>

                                        <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                                            {message.content}
                                        </p>

                                        <div className="text-xs text-gray-500 space-y-1">
                                            <div className="flex items-center space-x-4">
                                                <span>表: {message.tableName}</span>
                                                <span>库: {message.dbName}</span>
                                                {message.msgType && <span>类型: {message.msgType}</span>}
                                            </div>
                                            {(message.sender || message.receiver) && (
                                                <div className="flex items-center space-x-4">
                                                    {message.sender && <span>发送者: {message.sender}</span>}
                                                    {message.receiver && <span>接收者: {message.receiver}</span>}
                                                </div>
                                            )}
                                            <div>时间戳: {message.timestampNum}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {messages.length > 50 && (
                        <div className="bg-gray-50 px-6 py-3 text-center text-sm text-gray-600">
                            显示前50条，总共 {messages.length} 条消息
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}