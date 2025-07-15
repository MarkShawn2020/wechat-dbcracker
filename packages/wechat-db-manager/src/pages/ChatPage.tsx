import {useEffect, useRef, useState} from 'react';
import {QueryResult} from '../types';
import {dbManager} from '../api';
import {ChevronRight, Clock, Loader2, MessageSquare, Search, Users} from 'lucide-react';
import {useAtom} from 'jotai';
import {databasesAtom} from '../store/atoms';

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

export function ChatPage() {
    const [databases] = useAtom(databasesAtom);
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

                    const messageTable = tables.find(t =>
                        t.name.toLowerCase().includes('chat') ||
                        t.name.toLowerCase().includes('message') ||
                        t.name.toLowerCase().includes('msg')
                    );

                    if (messageTable) {
                        const result = await dbManager.queryTable(messageDb.id, messageTable.name, 200);
                        const messagesData = parseMessages(result, contact);
                        allMessages.push(...messagesData);
                    }
                } catch (err) {
                    console.warn(`加载消息数据库 ${messageDb.filename} 失败:`, err);
                }
            }

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
                isOwn: false,
                type: typeIndex !== -1 ? String(row[typeIndex]) : 'text'
            }))
            .filter(msg => msg.content && msg.content.trim() !== '');
    };

    const formatTimestamp = (timestamp: any): string => {
        if (typeof timestamp === 'number') {
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
        <div className="flex-1 flex bg-gray-50">
            {/* 联系人列表 */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                {/* 头部 */}
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-900 mb-4">聊天记录</h1>
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

                {/* 联系人列表 */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center">
                            <div className="text-red-600 text-sm bg-red-50 rounded-lg p-4">{error}</div>
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
                            {filteredContacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    onClick={() => {
                                        setSelectedContact(contact);
                                        loadMessages(contact);
                                    }}
                                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                                        selectedContact?.id === contact.id
                                            ? 'bg-blue-50 border-2 border-blue-200'
                                            : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900 truncate">
                                                {contact.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 truncate">
                                                {contact.username || '点击查看聊天记录'}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-300"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 聊天记录区域 */}
            <div className="flex-1 flex flex-col">
                {selectedContact ? (
                    <>
                        {/* 聊天头部 */}
                        <div className="bg-white px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center space-x-4">
                                <div
                                    className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">{selectedContact.name}</h2>
                                    <p className="text-sm text-gray-600">
                                        {messages.length} 条消息
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 消息列表 */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-gray-500">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300"/>
                                        <p>暂无聊天记录</p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div key={message.id}
                                         className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] ${message.isOwn ? 'order-1' : 'order-2'}`}>
                                            <div className="flex items-center mb-2">
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(message.timestamp)}
                        </span>
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                                                message.isOwn
                                                    ? 'bg-blue-500 text-white ml-auto'
                                                    : 'bg-white text-gray-900 border border-gray-100'
                                            }`}>
                                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
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
                        <div className="bg-white border-t border-gray-100 px-6 py-4">
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
                        className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
                            <div
                                className="p-6 bg-blue-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                                <MessageSquare className="h-12 w-12 text-blue-500"/>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-3">选择一个联系人</h2>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                点击左侧联系人列表开始查看聊天记录
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}