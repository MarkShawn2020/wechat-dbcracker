import {useEffect, useRef, useState} from 'react';
import {DatabaseInfo, QueryResult} from '../types';
import {dbManager} from '../api';
import {ChevronRight, Clock, MessageSquare, Search, Users} from 'lucide-react';

interface Contact {
    id: string;
    name: string;
    username?: string;
    lastMessage?: string;
    lastMessageTime?: string;
    messageCount?: number;
}

interface Message {
    id: string;
    content: string;
    timestamp: string;
    senderId: string;
    isOwn: boolean;
    type: string;
}

interface ChatViewProps {
    databases: DatabaseInfo[];
}

export function ChatView({databases}: ChatViewProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 获取联系人数据库
    const contactDb = databases.find(db => db.db_type === 'Contact');
    const messageDbs = databases.filter(db => db.db_type === 'Message');

    useEffect(() => {
        if (contactDb) {
            loadContacts();
        }
    }, [contactDb]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
        }
    }, [messages]);

    const loadContacts = async () => {
        if (!contactDb) return;

        try {
            setLoading(true);
            setError(null);

            await dbManager.connectDatabase(contactDb.id);

            // 查询联系人表，常见的表名有 wccontact_new2, Contact 等
            const tables = await dbManager.getTables(contactDb.id);
            const contactTable = tables.find(t =>
                t.name.toLowerCase().includes('contact') ||
                t.name.toLowerCase().includes('wccontact')
            );

            if (!contactTable) {
                setError('未找到联系人表');
                return;
            }

            const result = await dbManager.queryTable(contactDb.id, contactTable.name, 100);
            const contactsData = parseContacts(result);
            setContacts(contactsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载联系人失败');
        } finally {
            setLoading(false);
        }
    };

    const parseContacts = (result: QueryResult): Contact[] => {
        const {columns, rows} = result;

        // 查找相关列的索引
        const nameIndex = columns.findIndex(col =>
            col.toLowerCase().includes('name') ||
            col.toLowerCase().includes('nickname') ||
            col.toLowerCase().includes('remark')
        );
        const usernameIndex = columns.findIndex(col =>
            col.toLowerCase().includes('username') ||
            col.toLowerCase().includes('userid') ||
            col.toLowerCase().includes('id')
        );

        return rows
            .map((row, index) => ({
                id: usernameIndex !== -1 ? String(row[usernameIndex]) : `contact_${index}`,
                name: nameIndex !== -1 ? String(row[nameIndex]) : `联系人 ${index + 1}`,
                username: usernameIndex !== -1 ? String(row[usernameIndex]) : undefined,
            }))
            .filter(contact => contact.name && contact.name.trim() !== '' && !contact.name.includes('null'));
    };

    const loadMessages = async (contact: Contact) => {
        if (messageDbs.length === 0) {
            setError('未找到消息数据库');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const allMessages: Message[] = [];

            for (const messageDb of messageDbs) {
                try {
                    await dbManager.connectDatabase(messageDb.id);
                    const tables = await dbManager.getTables(messageDb.id);

                    // 查找消息表
                    const messageTable = tables.find(t =>
                        t.name.toLowerCase().includes('chat') ||
                        t.name.toLowerCase().includes('message') ||
                        t.name.toLowerCase().includes('msg')
                    );

                    if (messageTable) {
                        // 查询与该联系人相关的消息
                        const result = await dbManager.queryTable(messageDb.id, messageTable.name, 200);
                        const messagesData = parseMessages(result, contact);
                        allMessages.push(...messagesData);
                    }
                } catch (err) {
                    console.warn(`加载消息数据库 ${messageDb.filename} 失败:`, err);
                }
            }

            // 按时间排序
            allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            setMessages(allMessages);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载消息失败');
        } finally {
            setLoading(false);
        }
    };

    const parseMessages = (result: QueryResult, contact: Contact): Message[] => {
        const {columns, rows} = result;

        const contentIndex = columns.findIndex(col =>
            col.toLowerCase().includes('content') ||
            col.toLowerCase().includes('message') ||
            col.toLowerCase().includes('text')
        );
        const senderIndex = columns.findIndex(col =>
            col.toLowerCase().includes('sender') ||
            col.toLowerCase().includes('from') ||
            col.toLowerCase().includes('talker')
        );
        const timeIndex = columns.findIndex(col =>
            col.toLowerCase().includes('time') ||
            col.toLowerCase().includes('create') ||
            col.toLowerCase().includes('timestamp')
        );
        const typeIndex = columns.findIndex(col =>
            col.toLowerCase().includes('type') ||
            col.toLowerCase().includes('msgtype')
        );

        return rows
            .filter(row => {
                const sender = senderIndex !== -1 ? String(row[senderIndex]) : '';
                return sender.includes(contact.id) || sender.includes(contact.username || '');
            })
            .map((row, index) => ({
                id: `msg_${index}`,
                content: contentIndex !== -1 ? String(row[contentIndex]) : '',
                timestamp: timeIndex !== -1 ? formatTimestamp(row[timeIndex]) : new Date().toISOString(),
                senderId: senderIndex !== -1 ? String(row[senderIndex]) : '',
                isOwn: false, // 简化处理，实际需要判断是否为自己发送
                type: typeIndex !== -1 ? String(row[typeIndex]) : 'text'
            }))
            .filter(msg => msg.content && msg.content.trim() !== '');
    };

    const formatTimestamp = (timestamp: any): string => {
        if (typeof timestamp === 'number') {
            // 可能是Unix时间戳
            const date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000);
            return date.toISOString();
        }
        return String(timestamp);
    };

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    if (!contactDb) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
                <div className="text-center max-w-lg p-8">
                    <div className="p-6 bg-red-50 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                        <MessageSquare className="h-16 w-16 text-red-500"/>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">未找到联系人数据库</h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        请确保已加载包含联系人信息的数据库文件
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex h-full">
            {/* 联系人列表 */}
            <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
                {/* 搜索栏 */}
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400"/>
                        <input
                            type="text"
                            placeholder="搜索联系人..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* 联系人列表 */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-red-600 text-center">{error}</div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500">
                            <div className="text-center">
                                <Users className="h-12 w-12 mx-auto mb-2 text-slate-300"/>
                                <p>暂无联系人</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredContacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    onClick={() => {
                                        setSelectedContact(contact);
                                        loadMessages(contact);
                                    }}
                                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                                        selectedContact?.id === contact.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium text-slate-900 truncate">
                                                {contact.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 truncate">
                                                {contact.username || '点击查看聊天记录'}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-slate-400"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 聊天记录区域 */}
            <div className="flex-1 flex flex-col bg-slate-50">
                {selectedContact ? (
                    <>
                        {/* 聊天头部 */}
                        <div className="bg-white px-6 py-4 border-b border-slate-200 shadow-sm">
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">{selectedContact.name}</h2>
                                    <p className="text-sm text-slate-600">
                                        {messages.length} 条消息
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 消息列表 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-slate-500">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-2 text-slate-300"/>
                                        <p>暂无聊天记录</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div key={message.id}
                                         className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] ${message.isOwn ? 'order-1' : 'order-2'}`}>
                                            <div className="flex items-center mb-1">
                        <span className="text-xs text-slate-500">
                          {formatMessageTime(message.timestamp)}
                        </span>
                                            </div>
                                            <div className={`px-4 py-2 rounded-2xl ${
                                                message.isOwn
                                                    ? 'bg-blue-500 text-white ml-auto'
                                                    : 'bg-white text-slate-900 border border-slate-200'
                                            }`}>
                                                <p className="text-sm whitespace-pre-wrap break-words">
                                                    {message.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef}/>
                        </div>

                        {/* 消息统计 */}
                        <div className="bg-white border-t border-slate-200 px-6 py-3">
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                                <div className="flex items-center space-x-1">
                                    <MessageSquare className="h-4 w-4"/>
                                    <span>{messages.length} 条消息</span>
                                </div>
                                {messages.length > 0 && (
                                    <>
                                        <div className="flex items-center space-x-1">
                                            <Clock className="h-4 w-4"/>
                                            <span>最早: {formatMessageTime(messages[0].timestamp)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Clock className="h-4 w-4"/>
                                            <span>最新: {formatMessageTime(messages[messages.length - 1].timestamp)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-lg p-8">
                            <div
                                className="p-6 bg-blue-50 rounded-full w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                                <MessageSquare className="h-16 w-16 text-blue-500"/>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">选择一个联系人</h2>
                            <p className="text-slate-600 text-lg leading-relaxed">
                                点击左侧联系人列表开始查看聊天记录
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}