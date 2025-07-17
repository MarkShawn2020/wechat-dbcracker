import {useEffect, useRef, useState} from 'react';
import {QueryResult} from '../types';
import {dbManager} from '../api';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle,
    ChevronRight,
    Clock,
    Loader2,
    MessageSquare,
    Search,
    Users,
    XCircle
} from 'lucide-react';
import {useAtom} from 'jotai';
import {databasesAtom} from '../store/atoms';
import {Avatar, MessageAvatar} from '../components/Avatar';
import {ContactParser, EnhancedContact} from '../utils/contactParser';
import {EnhancedMessage, MessageParser} from '../utils/messageParser';

// 使用增强的联系人和消息类型

interface DebugInfo {
    step: string;
    status: 'pending' | 'success' | 'error';
    message: string;
    data?: any;
}

export function ChatPage() {
    const [databases] = useAtom(databasesAtom);
    const [contacts, setContacts] = useState<EnhancedContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<EnhancedContact | null>(null);
    const [messages, setMessages] = useState<EnhancedMessage[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
    const [contactsLoaded, setContactsLoaded] = useState(false);
    const [messageDebugInfo, setMessageDebugInfo] = useState<DebugInfo[]>([]);
    const [showDebug, setShowDebug] = useState(false);
    const [connectedDatabases, setConnectedDatabases] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 获取联系人数据库
    const contactDb = databases.find(db => db.db_type === 'Contact');
    const messageDbs = databases.filter(db => db.db_type === 'Message');

    const addDebugInfo = (step: string, status: 'pending' | 'success' | 'error', message: string, data?: any) => {
        setDebugInfo(prev => [...prev, {step, status, message, data}]);
        console.log(`[DEBUG] ${step}: ${status} - ${message}`, data);
    };

    const addMessageDebugInfo = (step: string, status: 'pending' | 'success' | 'error', message: string, data?: any) => {
        setMessageDebugInfo(prev => [...prev, {step, status, message, data}]);
        console.log(`[DEBUG] ${step}: ${status} - ${message}`, data);
    };

    useEffect(() => {
        if (!contactsLoaded && contactDb) {
            addDebugInfo('初始化', 'success', `找到 ${databases.length} 个数据库`, {
                contactDb: contactDb?.filename,
                messageDbs: messageDbs.map(db => db.filename)
            });
            loadContacts();
        } else if (!contactDb) {
            addDebugInfo('联系人数据库', 'error', '未找到Contact类型的数据库');
        }
    }, [contactDb, contactsLoaded]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
        }
    }, [messages]);

    const loadContacts = async () => {
        if (!contactDb) return;

        try {
            setContactsLoading(true);
            setError(null);
            setDebugInfo([]);
            setContactsLoaded(false);

            if (!connectedDatabases.has(contactDb.id)) {
                addDebugInfo('连接数据库', 'pending', `连接到 ${contactDb.filename}`);
                await dbManager.connectDatabase(contactDb.id);
                setConnectedDatabases(prev => new Set(prev).add(contactDb.id));
                addDebugInfo('连接数据库', 'success', '数据库连接成功');
            } else {
                addDebugInfo('连接数据库', 'success', '使用已有连接');
            }

            addDebugInfo('获取表列表', 'pending', '查询数据库表结构');
            const tables = await dbManager.getTables(contactDb.id);
            addDebugInfo('获取表列表', 'success', `找到 ${tables.length} 个表`, tables.map(t => t.name));

            const contactTable = tables.find(t =>
                t.name.toLowerCase().includes('contact') ||
                t.name.toLowerCase().includes('wccontact')
            );

            if (!contactTable) {
                addDebugInfo('查找联系人表', 'error', '未找到联系人相关表');
                setError('未找到联系人表');
                return;
            }

            addDebugInfo('查找联系人表', 'success', `使用表: ${contactTable.name}`);

            addDebugInfo('查询联系人数据', 'pending', `从表 ${contactTable.name} 查询所有数据`);
            const result = await dbManager.queryTable(contactDb.id, contactTable.name);
            addDebugInfo('查询联系人数据', 'success', `查询到 ${result.rows.length} 行数据`, {
                columns: result.columns,
                sampleRow: result.rows[0]
            });

            const contactsData = parseContacts(result);
            addDebugInfo('解析联系人', 'success', `解析出 ${contactsData.length} 个联系人`, contactsData.slice(0, 3));
            setContacts(contactsData);
            setContactsLoaded(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '加载联系人失败';
            addDebugInfo('加载联系人', 'error', errorMessage, err);
            setError(errorMessage);
        } finally {
            setContactsLoading(false);
        }
    };

    const parseContacts = (result: QueryResult): EnhancedContact[] => {
        addDebugInfo('解析联系人数据', 'pending', `使用增强解析器处理 ${result.rows.length} 条记录`);

        const enhancedContacts = ContactParser.parseContacts(result);

        addDebugInfo('解析联系人数据', 'success', `成功解析出 ${enhancedContacts.length} 个联系人`, {
            sampleContacts: enhancedContacts.slice(0, 3).map(contact => ({
                id: contact.id,
                displayName: contact.displayName,
                contactType: contact.contactType,
                hasRemark: !!contact.remark,
                hasNickname: !!contact.nickname,
                hasUsername: !!contact.username
            })),
            contactTypes: enhancedContacts.reduce((acc, contact) => {
                acc[contact.contactType || 'unknown'] = (acc[contact.contactType || 'unknown'] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        });

        return enhancedContacts;
    };

    const loadMessages = async (contact: EnhancedContact) => {
        if (messageDbs.length === 0) {
            addDebugInfo('消息数据库', 'error', '未找到Message类型的数据库');
            setError('未找到消息数据库');
            return;
        }

        try {
            setMessagesLoading(true);
            setError(null);
            // 清除之前的消息调试信息
            setMessageDebugInfo([]);
            const allMessages: EnhancedMessage[] = [];
            let globalMessageIndex = 0;

            addMessageDebugInfo('加载消息', 'pending', `为联系人 ${contact.displayName} 加载消息`);
            addMessageDebugInfo('消息数据库', 'success', `找到 ${messageDbs.length} 个消息数据库`, messageDbs.map(db => db.filename));

            for (const messageDb of messageDbs) {
                try {
                    if (!connectedDatabases.has(messageDb.id)) {
                        addMessageDebugInfo(`连接消息数据库`, 'pending', `连接到 ${messageDb.filename}`);
                        await dbManager.connectDatabase(messageDb.id);
                        setConnectedDatabases(prev => new Set(prev).add(messageDb.id));
                        addMessageDebugInfo(`连接消息数据库`, 'success', `已连接到 ${messageDb.filename}`);
                    } else {
                        addMessageDebugInfo(`连接消息数据库`, 'success', `使用已有连接: ${messageDb.filename}`);
                    }

                    const tables = await dbManager.getTables(messageDb.id);
                    addMessageDebugInfo(`获取消息表`, 'success', `${messageDb.filename} 中有 ${tables.length} 个表`, tables.map(t => t.name));

                    const messageTable = tables.find(t =>
                        t.name.toLowerCase().includes('chat') ||
                        t.name.toLowerCase().includes('message') ||
                        t.name.toLowerCase().includes('msg')
                    );

                    if (messageTable) {
                        addMessageDebugInfo(`查询消息表`, 'pending', `从 ${messageTable.name} 查询消息`);
                        const result = await dbManager.queryTable(messageDb.id, messageTable.name, 200);
                        addMessageDebugInfo(`查询消息表`, 'success', `查询到 ${result.rows.length} 条记录`, {
                            columns: result.columns,
                            sampleRow: result.rows[0]
                        });

                        const messagesData = MessageParser.parseMessages(
                            result,
                            contact,
                            contacts,
                            messageDb.id,
                            globalMessageIndex
                        );
                        globalMessageIndex += messagesData.length;
                        addMessageDebugInfo(`解析消息`, 'success', `从 ${messageDb.filename} 解析出 ${messagesData.length} 条消息`, {
                            messageTypes: messagesData.reduce((acc, msg) => {
                                acc[msg.messageType] = (acc[msg.messageType] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>),
                            sampleMessages: messagesData.slice(0, 3).map(msg => ({
                                senderName: msg.senderName,
                                content: msg.content.substring(0, 50),
                                messageType: msg.messageType
                            }))
                        });
                        allMessages.push(...messagesData);
                    } else {
                        addMessageDebugInfo(`查找消息表`, 'error', `在 ${messageDb.filename} 中未找到消息表`);
                    }
                } catch (err) {
                    const errorMessage = `加载消息数据库 ${messageDb.filename} 失败: ${err instanceof Error ? err.message : err}`;
                    addMessageDebugInfo(`数据库错误`, 'error', errorMessage, err);
                    console.warn(errorMessage, err);
                }
            }

            addMessageDebugInfo('排序消息', 'pending', `对 ${allMessages.length} 条消息进行排序`);
            allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            addMessageDebugInfo('排序消息', 'success', '消息排序完成');

            setMessages(allMessages);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '加载消息失败';
            addMessageDebugInfo('加载消息', 'error', errorMessage, err);
            setError(errorMessage);
        } finally {
            setMessagesLoading(false);
        }
    };

    // 使用增强的搜索功能
    const filteredContacts = ContactParser.searchContacts(contacts, searchTerm);

    const formatMessageTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (messageDate.getTime() === today.getTime()) {
            return date.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } else if (messageDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
            return '昨天';
        } else {
            return date.toLocaleDateString('zh-CN', {
                month: '2-digit',
                day: '2-digit'
            });
        }
    };

    const getStatusIcon = (status: DebugInfo['status']) => {
        switch (status) {
            case 'pending':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500"/>;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500"/>;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500"/>;
        }
    };

    if (!contactDb) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                    <div className="p-6 bg-red-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <MessageSquare className="h-12 w-12 text-red-500"/>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">未找到联系人数据库</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        请在数据库页面加载包含联系人信息的数据库文件
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex bg-gray-50 overflow-hidden">
            {/* 调试面板 - 独立滚动 */}
            {showDebug && (
                <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                    {/* 调试面板头部 - 不滚动 */}
                    <div className="flex-shrink-0 p-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">调试信息</h3>
                        <button
                            onClick={() => setShowDebug(false)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            隐藏调试面板
                        </button>
                    </div>
                    {/* 调试面板内容 - 独立滚动 */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                        {/* 联系人相关调试信息 */}
                        {debugInfo.map((info, index) => (
                            <div key={`contact_${index}`} className="flex items-start space-x-2 text-xs">
                                {getStatusIcon(info.status)}
                                <div className="flex-1">
                                    <div className="font-medium text-blue-700">{info.step}</div>
                                    <div className="text-gray-600">{info.message}</div>
                                    {info.data && (
                                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(info.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                        {/* 分隔线 */}
                        {debugInfo.length > 0 && messageDebugInfo.length > 0 && (
                            <hr className="border-gray-200 my-3"/>
                        )}
                        {/* 消息相关调试信息 */}
                        {messageDebugInfo.map((info, index) => (
                            <div key={`message_${index}`} className="flex items-start space-x-2 text-xs">
                                {getStatusIcon(info.status)}
                                <div className="flex-1">
                                    <div className="font-medium text-green-700">{info.step}</div>
                                    <div className="text-gray-600">{info.message}</div>
                                    {info.data && (
                                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(info.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 联系人列表 - 独立滚动 */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                {/* 联系人列表头部 - 不滚动 */}
                <div className="flex-shrink-0 p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">聊天记录</h1>
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                            title="显示调试信息"
                        >
                            <AlertCircle className="h-4 w-4"/>
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                        <input
                            type="text"
                            placeholder="搜索联系人..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {/* 联系人列表内容 - 独立滚动 */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {contactsLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center">
                            <div className="text-red-600 text-sm bg-red-50 rounded-lg p-4">{error}</div>
                            <button
                                onClick={loadContacts}
                                disabled={contactsLoading}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                重试
                            </button>
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300"/>
                                <p className="text-sm">暂无联系人</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 space-y-1">
                            {filteredContacts.map((contact) => {
                                const displayInfo = ContactParser.getDisplayInfo(contact);
                                return (
                                    <div
                                        key={contact.id}
                                        onClick={() => {
                                            if (!messagesLoading && selectedContact?.id !== contact.id) {
                                                setSelectedContact(contact);
                                                loadMessages(contact);
                                            }
                                        }}
                                        className={`p-4 rounded-xl transition-all ${
                                            selectedContact?.id === contact.id
                                                ? 'bg-blue-50 border-2 border-blue-200'
                                                : 'hover:bg-gray-50'
                                        } ${
                                            messagesLoading
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Avatar
                                                name={displayInfo.name}
                                                size="lg"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 truncate">
                                                    {displayInfo.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {displayInfo.subtitle}
                                                </p>
                                                {contact.contactType !== 'user' && (
                                                    <span
                                                        className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                                                            contact.contactType === 'group'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {contact.contactType === 'group' ? '群聊' : '公众号'}
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-300"/>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* 聊天记录区域 - 独立滚动 */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedContact ? (
                    <>
                        {/* 聊天头部 - 不滚动 */}
                        <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Avatar
                                        name={selectedContact.displayName}
                                        size="md"
                                    />
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                            {selectedContact.displayName}
                                            {messagesLoading && (
                                                <Loader2 className="h-4 w-4 animate-spin text-blue-600 ml-2"/>
                                            )}
                                        </h2>
                                        <p className="text-sm text-gray-600">
                                            {messagesLoading ? '加载中...' : `${messages.length} 条消息`}
                                            {selectedContact.contactType !== 'user' && (
                                                <span className="ml-2 text-xs text-blue-600">
                                                    • {selectedContact.contactType === 'group' ? '群聊' : '公众号'}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedContact(null);
                                        setMessages([]);
                                        setError(null);
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="返回联系人列表"
                                >
                                    <ArrowLeft className="h-5 w-5"/>
                                </button>
                            </div>
                        </div>

                        {/* 消息列表 - 独立滚动 */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                            {messagesLoading ? (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <div className="text-center text-gray-500">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300"/>
                                        <p>暂无聊天记录</p>
                                        {showDebug && (
                                            <p className="text-xs mt-2">查看左侧调试面板了解详情</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div key={message.id}
                                         className={`flex items-start space-x-3 ${message.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                        {/* 发送者头像 */}
                                        <MessageAvatar
                                            name={message.senderDisplayName}
                                            isOwn={message.isOwn}
                                        />

                                        {/* 消息内容 */}
                                        <div
                                            className={`max-w-[70%] ${message.isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                                            {/* 发送者名字和时间 */}
                                            <div
                                                className={`flex items-center mb-1 space-x-2 ${message.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                                <span className="text-xs font-medium text-gray-700">
                                                    {message.senderDisplayName}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {formatMessageTime(message.timestamp)}
                                                </span>
                                                {message.messageType !== 'text' && (
                                                    <span
                                                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                                        {MessageParser.getMessageTypeLabel(message.messageType)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* 消息气泡 */}
                                            <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                                                message.isOwn
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white text-gray-900 border border-gray-100'
                                            }`}>
                                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                                    {MessageParser.formatMessageContent(message)}
                                                </p>
                                                {message.attachment && (
                                                    <div className="mt-2 text-xs opacity-75">
                                                        📎 {message.attachment.filename}
                                                        {message.attachment.size && (
                                                            <span
                                                                className="ml-1">({Math.round(message.attachment.size / 1024)}KB)</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef}/>
                        </div>

                        {/* 消息统计 - 不滚动 */}
                        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-6 py-4">
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                                <div className="flex items-center space-x-2">
                                    <MessageSquare className="h-4 w-4"/>
                                    <span>{messages.length} 条消息</span>
                                </div>
                                {messages.length > 0 && (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4"/>
                                            <span>最早: {formatMessageTime(messages[0].timestamp)}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4"/>
                                            <span>最新: {formatMessageTime(messages[messages.length - 1].timestamp)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div
                        className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 overflow-y-auto">
                        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                            <div
                                className="p-6 bg-blue-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                                <MessageSquare className="h-12 w-12 text-blue-500"/>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-3">选择一个联系人</h2>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                点击左侧联系人列表开始查看聊天记录
                            </p>
                            <div className="mt-6 flex items-center justify-center space-x-2">
                                <span className="text-sm text-gray-500">共有</span>
                                <span className="text-lg font-bold text-blue-600">{contacts.length}</span>
                                <span className="text-sm text-gray-500">个联系人</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}