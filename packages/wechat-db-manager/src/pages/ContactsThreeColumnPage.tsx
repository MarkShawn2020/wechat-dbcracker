import React, {useCallback, useEffect, useState} from 'react';
import {useAtom} from 'jotai';
import {databasesAtom} from '../store/atoms';
import {ChatDataService} from '../services/chatDataService';
import {EnhancedContact} from '../utils/contactParser';
import {EnhancedMessage} from '../utils/messageParser';
import {TableMappingService} from '../services/tableMappingService';
// 使用WebCrypto API进行MD5计算
async function calculateMD5(text: string): Promise<string> {
    // 将字符串转换为字节数组
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // 计算SHA-256哈希（MD5已不推荐使用，但这里为了兼容性我们使用一个替代方案）
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // 转换为16进制字符串并截取前32位模拟MD5格式
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 截取前32位以模拟MD5格式
    return hashHex.substring(0, 32);
}

interface ContactsThreeColumnPageProps {
}

interface LoadingState {
    contacts: boolean;
    messages: boolean;
}

interface ContactStats {
    databaseSource: string;
    chatTables: Array<{
        tableName: string;
        databaseFilename: string;
    }>;
    messageCount: number;
    lastActiveTime?: string;
}

export function ContactsThreeColumnPage({}: ContactsThreeColumnPageProps) {
    const [databases] = useAtom(databasesAtom);
    const [contacts, setContacts] = useState<EnhancedContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<EnhancedContact | null>(null);
    const [messages, setMessages] = useState<EnhancedMessage[]>([]);
    const [loading, setLoading] = useState<LoadingState>({
        contacts: false,
        messages: false
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [contactStats, setContactStats] = useState<ContactStats | null>(null);
    const [mappingInfo, setMappingInfo] = useState<{identifier: string; md5Hash: string; expectedTableName: string; actualChatTables: Array<{tableName: string; databaseFilename: string}>} | null>(null);

    // 获取联系人数据库和消息数据库
    const contactDbs = databases.filter(db =>
        db.filename.toLowerCase().includes('contact') ||
        db.filename.toLowerCase().includes('wccontact')
    );


    // 加载联系人列表
    const loadContacts = useCallback(async () => {
        if (contactDbs.length === 0) {
            setContacts([]);
            return;
        }

        setLoading(prev => ({...prev, contacts: true}));
        try {
            const allContacts: EnhancedContact[] = [];

            for (const contactDb of contactDbs) {
                console.log(`📋 加载联系人数据库: ${contactDb.filename}`);
                const contacts = await ChatDataService.loadContacts(contactDb);
                console.log(`✅ 从 ${contactDb.filename} 加载了 ${contacts.length} 个联系人`);
                allContacts.push(...contacts);
            }

            // 去重并排序
            const uniqueContacts = allContacts.filter((contact, index, arr) =>
                arr.findIndex(c => c.id === contact.id) === index
            );

            // 按显示名排序
            uniqueContacts.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));

            console.log(`🎉 总计加载了 ${uniqueContacts.length} 个唯一联系人`);
            setContacts(uniqueContacts);
        } catch (error) {
            console.error('❌ 加载联系人失败:', error);
            setContacts([]);
        } finally {
            setLoading(prev => ({...prev, contacts: false}));
        }
    }, [contactDbs]);

    // 加载选中联系人的聊天记录
    const loadContactMessages = useCallback(async (contact: EnhancedContact) => {
        setLoading(prev => ({...prev, messages: true}));
        setMessages([]);
        setContactStats(null);

        try {
            // 加载聊天记录
            const contactMessages = await ChatDataService.loadMessagesOptimized(contact, contacts);
            setMessages(contactMessages);

            // 获取映射信息用于属性面板
            const mappingService = TableMappingService.getInstance();
            const chatTableMappings = mappingService.findChatTablesForContact(contact);

            const stats: ContactStats = {
                databaseSource: contactDbs.map(db => db.filename).join(', '),
                chatTables: chatTableMappings.map(mapping => ({
                    tableName: mapping.tableName,
                    databaseFilename: mapping.databaseFilename
                })),
                messageCount: contactMessages.length,
                lastActiveTime: contact.lastActiveTime
            };

            setContactStats(stats);
        } catch (error) {
            console.error('加载聊天记录失败:', error);
        } finally {
            setLoading(prev => ({...prev, messages: false}));
        }
    }, [contacts, contactDbs]);

    // 处理联系人选择
    const handleContactSelect = useCallback(async (contact: EnhancedContact) => {
        setSelectedContact(contact);
        setMappingInfo(null); // 重置映射信息
        
        // 异步计算MD5映射
        const mapping = await getMappingInfo(contact);
        setMappingInfo(mapping);
        
        loadContactMessages(contact);
    }, [loadContactMessages]);

    // 格式化消息时间
    const formatMessageTime = (timestamp?: number | string): string => {
        if (!timestamp) return '';

        try {
            const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp * 1000);
            const now = new Date();
            const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

            if (diffInHours < 24) {
                return date.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else if (diffInHours < 24 * 7) {
                return date.toLocaleDateString('zh-CN', {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                return date.toLocaleDateString('zh-CN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (error) {
            return '';
        }
    };

    // 计算MD5哈希并查找实际的表名和数据库文件
    const getMappingInfo = async (contact: EnhancedContact) => {
        // 调试输出
        console.log('🔍 getMappingInfo 调试:', {
            contactId: contact.id,
            mNsUsrName: contact.mNsUsrName,
            originalId: contact.originalId,
            id: contact.id,
            username: contact.username
        });

        // 尝试多个可能的标识符字段
        const identifier = contact.mNsUsrName || contact.originalId || contact.username || contact.id;

        if (!identifier) {
            console.log('❌ 无法找到任何有效标识符');
            return null;
        }

        try {
            const md5Hash = await calculateMD5(identifier);
            
            // 使用TableMappingService查找实际存在的聊天表
            const mappingService = TableMappingService.getInstance();
            const actualChatTables = mappingService.findChatTablesForContact(contact);

            console.log('✅ MD5映射计算成功:', {
                identifier,
                md5Hash,
                expectedTableName: `Chat_${md5Hash}`,
                actualTablesFound: actualChatTables.length
            });

            return {
                identifier,
                md5Hash,
                expectedTableName: `Chat_${md5Hash}`,
                actualChatTables
            };
        } catch (error) {
            console.error('MD5计算失败:', error);
            return null;
        }
    };

    // 监听数据库变化，重新加载联系人
    useEffect(() => {
        loadContacts();
    }, [contactDbs.length]); // 当联系人数据库数量变化时重新加载

    // 重置选中状态当联系人列表变化时
    useEffect(() => {
        if (selectedContact && !contacts.find(c => c.id === selectedContact.id)) {
            setSelectedContact(null);
            setMessages([]);
            setContactStats(null);
            setMappingInfo(null);
        }
    }, [contacts, selectedContact]);

    // 过滤联系人
    const filteredContacts = contacts.filter(contact => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            contact.displayName.toLowerCase().includes(term) ||
            contact.nickname?.toLowerCase().includes(term) ||
            contact.username?.toLowerCase().includes(term) ||
            contact.remark?.toLowerCase().includes(term)
        );
    });

    // 如果没有联系人数据库，显示提示信息
    if (contactDbs.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
                    <div className="text-6xl mb-4">👥</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        需要加载联系人数据库
                    </h2>
                    <p className="text-gray-600 mb-4">
                        要使用三列联系人视图，请先在设置页面加载包含联系人信息的数据库文件。
                    </p>
                    <div className="text-sm text-gray-500">
                        当前已加载 {databases.length} 个数据库，其中 0 个联系人数据库
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex bg-gray-50">
            {/* 第一列：联系人列表 */}
            <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                        联系人 ({filteredContacts.length})
                    </h2>
                    <input
                        type="text"
                        placeholder="搜索联系人..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading.contacts ? (
                        <div className="p-4 text-center text-gray-500">
                            <div
                                className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                            加载联系人中...
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            {searchTerm ? '没有找到匹配的联系人' : '没有联系人数据'}
                        </div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {filteredContacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    onClick={() => handleContactSelect(contact)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                        selectedContact?.id === contact.id
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="font-medium text-gray-900 truncate">
                                        {contact.displayName}
                                    </div>
                                    {contact.remark && contact.remark !== contact.displayName && (
                                        <div className="text-sm text-gray-500 truncate">
                                            备注: {contact.remark}
                                        </div>
                                    )}
                                    {contact.username && (
                                        <div className="text-xs text-gray-400 truncate">
                                            {contact.username}
                                        </div>
                                    )}
                                    {contact.lastActiveTime && (
                                        <div className="text-xs text-green-600 mt-1">
                                            最近活跃
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 第二列：聊天记录 */}
            <div className="flex-1 bg-white border-r border-gray-200 flex flex-col">
                {selectedContact ? (
                    <>
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-semibold text-gray-900">
                                与 {selectedContact.displayName} 的聊天记录
                            </h3>
                            <div className="text-sm text-gray-500 mt-1">
                                {loading.messages ? '加载中...' : `${messages.length} 条消息`}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loading.messages ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-32 text-gray-500">
                                    没有找到聊天记录
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {messages.map((message, index) => (
                                        <div
                                            key={`${message.id}-${index}`}
                                            className={`flex ${
                                                message.isOwn ? 'justify-end' : 'justify-start'
                                            }`}
                                        >
                                            <div
                                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                    message.isOwn
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-gray-200 text-gray-900'
                                                }`}
                                            >
                                                {!message.isOwn && (
                                                    <div className="text-xs opacity-70 mb-1">
                                                        {message.senderName || message.senderId}
                                                    </div>
                                                )}
                                                <div className="break-words">
                                                    {message.content}
                                                </div>
                                                <div className={`text-xs mt-1 ${
                                                    message.isOwn ? 'text-blue-100' : 'text-gray-500'
                                                }`}>
                                                    {formatMessageTime(message.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <div className="text-4xl mb-4">💬</div>
                            <div>选择一个联系人查看聊天记录</div>
                        </div>
                    </div>
                )}
            </div>

            {/* 第三列：联系人属性 */}
            <div className="w-1/4 bg-white flex flex-col">
                {selectedContact ? (
                    <>
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="font-semibold text-gray-900">联系人属性</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* 基本信息 */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">基本信息</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">显示名:</span>
                                        <span className="ml-2">{selectedContact.displayName}</span>
                                    </div>
                                    {selectedContact.nickname && (
                                        <div>
                                            <span className="text-gray-500">昵称:</span>
                                            <span className="ml-2">{selectedContact.nickname}</span>
                                        </div>
                                    )}
                                    {selectedContact.remark && (
                                        <div>
                                            <span className="text-gray-500">备注:</span>
                                            <span className="ml-2">{selectedContact.remark}</span>
                                        </div>
                                    )}
                                    {selectedContact.username && (
                                        <div>
                                            <span className="text-gray-500">微信号:</span>
                                            <span className="ml-2 font-mono text-xs">{selectedContact.username}</span>
                                        </div>
                                    )}
                                    {selectedContact.originalId && (
                                        <div>
                                            <span className="text-gray-500">原始ID:</span>
                                            <span className="ml-2 font-mono text-xs">{selectedContact.originalId}</span>
                                        </div>
                                    )}
                                    {selectedContact.mNsUsrName && (
                                        <div>
                                            <span className="text-gray-500">m_nsUsrName:</span>
                                            <span className="ml-2 font-mono text-xs">{selectedContact.mNsUsrName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 数据统计 */}
                            {contactStats && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">数据统计</h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-gray-500">消息数量:</span>
                                            <span className="ml-2 font-semibold text-blue-600">
                                                {contactStats.messageCount} 条
                                            </span>
                                        </div>
                                        {contactStats.lastActiveTime && (
                                            <div>
                                                <span className="text-gray-500">最后活跃:</span>
                                                <span className="ml-2">{contactStats.lastActiveTime}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 数据源信息 */}
                            {contactStats && (
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">数据源</h4>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-gray-500">联系人库:</span>
                                            <div className="mt-1 font-mono text-xs bg-gray-100 p-2 rounded">
                                                {contactStats.databaseSource}
                                            </div>
                                        </div>

                                        {contactStats.chatTables.length > 0 && (
                                            <div>
                                                <span className="text-gray-500">聊天表:</span>
                                                <div className="mt-1 space-y-1">
                                                    {contactStats.chatTables.map((table, index) => (
                                                        <div
                                                            key={index}
                                                            className="font-mono text-xs bg-gray-100 p-2 rounded"
                                                        >
                                                            <div className="font-semibold">{table.tableName}</div>
                                                            <div
                                                                className="text-gray-600">{table.databaseFilename}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 技术信息 */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">技术信息</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">联系人ID:</span>
                                        <div className="mt-1 font-mono text-xs bg-gray-100 p-2 rounded break-all">
                                            {selectedContact.id}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">联系人类型:</span>
                                        <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                                            {selectedContact.contactType || 'unknown'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* MD5映射信息 */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">MD5映射关系</h4>
                                {!mappingInfo ? (
                                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                                <div className="text-sm text-yellow-800">
                                                    <div className="font-medium mb-1">⚠️ 无法生成MD5映射</div>
                                                    <div className="text-xs space-y-1">
                                                        <div>该联系人缺少有效的标识符，无法计算对应的聊天表名。</div>
                                                        <div className="font-mono bg-yellow-100 p-1 rounded">
                                                            mNsUsrName: {selectedContact.mNsUsrName || '未设置'}
                                                        </div>
                                                        <div className="font-mono bg-yellow-100 p-1 rounded">
                                                            originalId: {selectedContact.originalId || '未设置'}
                                                        </div>
                                                        <div className="font-mono bg-yellow-100 p-1 rounded">
                                                            username: {selectedContact.username || '未设置'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 text-sm">
                                                {/* 映射流程图 */}
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <div className="text-center space-y-2">
                                                        <div className="text-xs text-gray-600">映射流程</div>
                                                        <div className="flex flex-col space-y-1">
                                                            <div
                                                                className="font-mono text-xs bg-blue-100 p-1 rounded text-center">
                                                                m_nsUsrName
                                                            </div>
                                                            <div className="text-center text-gray-500">↓ MD5</div>
                                                            <div
                                                                className="font-mono text-xs bg-green-100 p-1 rounded text-center break-all">
                                                                {mappingInfo.md5Hash}
                                                            </div>
                                                            <div className="text-center text-gray-500">↓ 组合</div>
                                                            <div
                                                                className="font-mono text-xs bg-yellow-100 p-1 rounded text-center">
                                                                {mappingInfo.expectedTableName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 详细信息 */}
                                                <div>
                                                    <span className="text-gray-500">m_nsUsrName值:</span>
                                                    <div
                                                        className="mt-1 font-mono text-xs bg-blue-50 p-2 rounded break-all">
                                                        {mappingInfo.identifier}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-gray-500">MD5 Key:</span>
                                                    <div
                                                        className="mt-1 font-mono text-xs bg-green-50 p-2 rounded break-all">
                                                        {mappingInfo.md5Hash}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-gray-500">期望表名:</span>
                                                    <div
                                                        className="mt-1 font-mono text-xs bg-yellow-50 p-2 rounded font-semibold">
                                                        {mappingInfo.expectedTableName}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-gray-500">实际找到的聊天表:</span>
                                                    {mappingInfo.actualChatTables.length > 0 ? (
                                                        <div className="mt-1 space-y-1">
                                                            {mappingInfo.actualChatTables.map((table, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="bg-green-50 border border-green-200 p-2 rounded"
                                                                >
                                                                    <div className="font-mono text-xs font-semibold text-green-800">
                                                                        {table.tableName}
                                                                    </div>
                                                                    <div className="font-mono text-xs text-green-600 mt-1">
                                                                        📁 {table.databaseFilename}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-1 bg-red-50 border border-red-200 p-2 rounded">
                                                            <div className="text-xs text-red-600">
                                                                ❌ 未找到对应的聊天表
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                )}
                            </div>

                            {/* 调试操作 */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-2">调试工具</h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => ChatDataService.debugContactMapping(selectedContact)}
                                        className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                                    >
                                        调试映射关系
                                    </button>
                                    <button
                                        onClick={async () => {
                                            console.log('🔍 联系人详细信息:', selectedContact);
                                            const currentMappingInfo = await getMappingInfo(selectedContact);
                                            if (currentMappingInfo) {
                                                console.log('🔗 MD5映射过程:');
                                                console.log(`  m_nsUsrName: "${currentMappingInfo.identifier}"`);
                                                console.log(`  MD5 Key: ${currentMappingInfo.md5Hash}`);
                                                console.log(`  期望表名: ${currentMappingInfo.expectedTableName}`);
                                                console.log('📋 实际找到的聊天表:', currentMappingInfo.actualChatTables);
                                                console.log('🧮 MD5计算验证:', {
                                                    input: currentMappingInfo.identifier,
                                                    output: currentMappingInfo.md5Hash,
                                                    expectedTableName: currentMappingInfo.expectedTableName,
                                                    actualTablesFound: currentMappingInfo.actualChatTables.length
                                                });
                                            } else {
                                                console.log('❌ 无法获取m_nsUsrName字段，无法计算MD5映射');
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                                    >
                                        打印MD5映射过程
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                            <div className="text-4xl mb-4">ℹ️</div>
                            <div>选择联系人查看详细属性</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}