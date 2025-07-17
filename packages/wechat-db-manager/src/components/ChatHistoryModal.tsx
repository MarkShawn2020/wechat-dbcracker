import {useCallback, useEffect, useRef, useState} from 'react';
import {Bot, Clock, Download, Filter, MessageSquare, Search, User, X} from 'lucide-react';
import {EnhancedContact} from '../utils/contactParser';
import {EnhancedMessage, MessageParser} from '../utils/messageParser';
import {ChatDataService} from '../services/chatDataService';
import {DatabaseInfo} from '../types';
import {Avatar} from './Avatar';

interface ChatHistoryModalProps {
    contact: EnhancedContact;
    messageDbs: DatabaseInfo[];
    allContacts: EnhancedContact[];
    isOpen: boolean;
    onClose: () => void;
}

interface MessageGroup {
    date: string;
    messages: EnhancedMessage[];
}

export function ChatHistoryModal({
                                     contact,
                                     messageDbs,
                                     allContacts,
                                     isOpen,
                                     onClose
                                 }: ChatHistoryModalProps) {
    const [messages, setMessages] = useState<EnhancedMessage[]>([]);
    const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredMessages, setFilteredMessages] = useState<EnhancedMessage[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedMessageTypes, setSelectedMessageTypes] = useState<Set<string>>(
        new Set(['text', 'image', 'voice', 'video', 'file', 'system'])
    );

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, []);

    // 加载消息
    const loadMessages = useCallback(async () => {
        if (!contact || messageDbs.length === 0) return;

        try {
            setLoading(true);
            setError(null);

            console.log(`开始加载联系人 ${contact.displayName} 的消息...`);

            const loadedMessages = await ChatDataService.loadMessagesOptimized(
                contact,
                allContacts
            );

            console.log(`加载完成，共 ${loadedMessages.length} 条消息`);

            setMessages(loadedMessages);

            // 立即滚动到底部
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '加载消息失败';
            setError(errorMessage);
            console.error('加载消息失败:', err);
        } finally {
            setLoading(false);
        }
    }, [contact, messageDbs, allContacts, scrollToBottom]);

    // 处理搜索和过滤
    useEffect(() => {
        let filtered = messages;

        // 应用消息类型过滤
        if (selectedMessageTypes.size < 6) {
            filtered = filtered.filter(msg => selectedMessageTypes.has(msg.messageType));
        }

        // 应用搜索过滤
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(msg =>
                msg.content.toLowerCase().includes(term) ||
                msg.senderDisplayName.toLowerCase().includes(term)
            );
        }

        setFilteredMessages(filtered);
    }, [messages, searchTerm, selectedMessageTypes]);

    // 按日期分组消息
    useEffect(() => {
        const groups: MessageGroup[] = [];
        let currentDate = '';
        let currentGroup: MessageGroup | null = null;

        filteredMessages.forEach(message => {
            const messageDate = new Date(message.timestamp).toLocaleDateString('zh-CN');

            if (messageDate !== currentDate) {
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                currentDate = messageDate;
                currentGroup = {
                    date: messageDate,
                    messages: [message]
                };
            } else {
                currentGroup?.messages.push(message);
            }
        });

        if (currentGroup) {
            groups.push(currentGroup);
        }

        setMessageGroups(groups);
    }, [filteredMessages]);

    // 监听模态框打开状态
    useEffect(() => {
        if (isOpen) {
            loadMessages();
        } else {
            // 重置状态
            setMessages([]);
            setMessageGroups([]);
            setFilteredMessages([]);
            setSearchTerm('');
            setError(null);
        }
    }, [isOpen, loadMessages]);

    // 处理键盘事件
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    // 格式化时间
    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    // 消息类型过滤器
    const messageTypeFilters = [
        {type: 'text', label: '文本', icon: MessageSquare},
        {type: 'image', label: '图片', icon: User},
        {type: 'voice', label: '语音', icon: User},
        {type: 'video', label: '视频', icon: User},
        {type: 'file', label: '文件', icon: Download},
        {type: 'system', label: '系统', icon: Bot}
    ];

    // 切换消息类型过滤
    const toggleMessageType = (type: string) => {
        const newSelected = new Set(selectedMessageTypes);
        if (newSelected.has(type)) {
            newSelected.delete(type);
        } else {
            newSelected.add(type);
        }
        setSelectedMessageTypes(newSelected);
    };

    // 获取消息样式
    const getMessageStyle = (message: EnhancedMessage) => {
        const isOwn = message.isOwn;
        return {
            container: `flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`,
            bubble: `max-w-[70%] px-3 py-2 rounded-lg ${
                isOwn
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900 border border-gray-200'
            }`,
            time: `text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'} mt-1`
        };
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] mx-4 flex flex-col"
            >
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <Avatar name={contact.displayName} size="lg"/>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{contact.displayName}</h2>
                            <p className="text-sm text-gray-600">
                                {filteredMessages.length} / {messages.length} 条消息
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500"/>
                    </button>
                </div>

                {/* 搜索和过滤 */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-2 mb-3">
                        <div className="relative flex-1">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <input
                                type="text"
                                placeholder="搜索消息内容..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-lg border transition-colors ${
                                showFilters
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <Filter className="h-4 w-4"/>
                        </button>
                    </div>

                    {/* 消息类型过滤器 */}
                    {showFilters && (
                        <div className="flex flex-wrap gap-2">
                            {messageTypeFilters.map(({type, label, icon: Icon}) => (
                                <button
                                    key={type}
                                    onClick={() => toggleMessageType(type)}
                                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                                        selectedMessageTypes.has(type)
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    <Icon className="h-3 w-3"/>
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div
                                    className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                                <p className="text-gray-600">正在加载消息...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div
                                    className="p-3 bg-red-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                                    <X className="h-6 w-6 text-red-600"/>
                                </div>
                                <p className="text-red-600 mb-3">{error}</p>
                                <button
                                    onClick={loadMessages}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    重试
                                </button>
                            </div>
                        </div>
                    ) : messageGroups.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3"/>
                                <p className="text-gray-500">
                                    {searchTerm ? '没有找到匹配的消息' : '暂无聊天记录'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messageGroups.map((group, groupIndex) => (
                                <div key={groupIndex}>
                                    {/* 日期分隔符 */}
                                    <div className="flex items-center justify-center mb-4">
                                        <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                                            {group.date}
                                        </div>
                                    </div>

                                    {/* 消息列表 */}
                                    <div className="space-y-1">
                                        {group.messages.map((message) => {
                                            const style = getMessageStyle(message);
                                            const content = MessageParser.formatMessageContent(message);

                                            return (
                                                <div key={message.id} className={style.container}>
                                                    <div className={style.bubble}>
                                                        <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium opacity-75">
                                {message.senderDisplayName}
                              </span>
                                                            <span className={style.time}>
                                {formatTime(message.timestamp)}
                              </span>
                                                        </div>
                                                        <p className="text-sm whitespace-pre-wrap break-words">
                                                            {content}
                                                        </p>

                                                        {/* 消息类型标签 */}
                                                        {message.messageType !== 'text' && (
                                                            <div className="mt-1">
                                <span className={`inline-block px-2 py-1 text-xs rounded ${
                                    message.isOwn
                                        ? 'bg-blue-600 text-blue-100'
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {MessageParser.getMessageTypeLabel(message.messageType)}
                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef}/>
                        </div>
                    )}
                </div>

                {/* 底部统计信息 */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                                <MessageSquare className="h-4 w-4"/>
                                <span>总消息: {messages.length}</span>
                            </div>
                            {searchTerm && (
                                <div className="flex items-center space-x-1">
                                    <Search className="h-4 w-4"/>
                                    <span>搜索结果: {filteredMessages.length}</span>
                                </div>
                            )}
                        </div>
                        {messageGroups.length > 0 && (
                            <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4"/>
                                <span>
                  {messageGroups[0]?.date} ~ {messageGroups[messageGroups.length - 1]?.date}
                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}