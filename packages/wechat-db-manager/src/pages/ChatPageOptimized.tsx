import {useCallback, useEffect, useRef} from 'react';
import {AlertCircle, ArrowLeft, ChevronRight, Clock, Loader2, MessageSquare, Search, Users} from 'lucide-react';
import {useAtom} from 'jotai';
import {databasesAtom} from '../store/atoms';
import {Avatar, MessageAvatar} from '../components/Avatar';
import {ContactParser} from '../utils/contactParser';
import {MessageParser} from '../utils/messageParser';
import {useChatState} from '../hooks/useChatState';
import {ChatDataService} from '../services/chatDataService';

export function ChatPage() {
    const [databases] = useAtom(databasesAtom);
    const {state, actions} = useChatState();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 获取联系人和消息数据库
    const contactDb = databases.find(db => db.db_type === 'Contact');
    const messageDbs = databases.filter(db => db.db_type === 'Message');

    // 自动滚动到最新消息
    useEffect(() => {
        if (messagesEndRef.current && state.currentMessages.length > 0) {
            messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
        }
    }, [state.currentMessages]);

    // 初始化 - 加载联系人
    useEffect(() => {
        if (contactDb && state.contactsPhase === 'idle') {
            loadContacts();
        }
    }, [contactDb]);

    // 取消令牌
    const [cancellationToken, setCancellationToken] = useState<{ cancelled: boolean }>({cancelled: false});
    const [loadingProgress, setLoadingProgress] = useState<{ message: string; percentage: number } | null>(null);

    // 加载联系人数据（多种策略）
    const loadContacts = useCallback(async () => {
        if (!contactDb) {
            actions.contactsError('未找到Contact类型的数据库');
            return;
        }

        // 重置取消令牌
        const newCancellationToken = {cancelled: false};
        setCancellationToken(newCancellationToken);
        setLoadingProgress(null);

        try {
            actions.startLoadingContacts();

            // 加载有聊天记录的联系人
            const contacts = await ChatDataService.loadContactsWithChatHistory(
                contactDb,
                messageDbs,
                (message, percentage) => {
                    setLoadingProgress({message, percentage});
                },
                newCancellationToken
            );

            if (!newCancellationToken.cancelled) {
                actions.contactsLoaded(contacts);
                setLoadingProgress(null);
            }
        } catch (err) {
            if (!newCancellationToken.cancelled) {
                const errorMessage = err instanceof Error ? err.message : '加载联系人失败';
                actions.contactsError(errorMessage);
                setLoadingProgress(null);
            }
        }
    }, [contactDb, messageDbs, actions]);

    // 取消加载
    const cancelLoading = useCallback(() => {
        setCancellationToken(prev => ({...prev, cancelled: true}));
        setLoadingProgress(null);
    }, []);

    // 选择联系人
    const handleSelectContact = useCallback(async (contact: typeof state.selectedContact) => {
        if (!contact || state.selectedContact?.id === contact.id) return;

        // 立即切换选中状态（流畅体验）
        actions.selectContact(contact);

        // 检查是否已有缓存
        if (state.messagesCache[contact.id]) {
            // 有缓存，无需加载
            return;
        }

        // 没有缓存，开始加载消息
        if (messageDbs.length === 0) {
            actions.messagesError(contact.id, '未找到消息数据库');
            return;
        }

        try {
            actions.startLoadingMessages(contact.id);
            const messages = await ChatDataService.loadMessages(contact, messageDbs, state.contacts);
            actions.messagesLoaded(contact.id, messages);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '加载消息失败';
            actions.messagesError(contact.id, errorMessage);
        }
    }, [state.selectedContact, state.messagesCache, state.contacts, messageDbs, actions]);

    // 清除选中联系人
    const handleClearSelection = useCallback(() => {
        actions.selectContact(null);
    }, [actions]);

    // 格式化消息时间
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

    // 无联系人数据库的错误状态
    if (!contactDb) {
        return (
            <div className="h-full flex bg-gray-50 overflow-hidden">
                {/* 左侧占位区域 */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                    <div className="flex-shrink-0 p-6 border-b border-gray-100">
                        <h1 className="text-xl font-bold text-gray-900 mb-4">聊天记录</h1>
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <input
                                type="text"
                                placeholder="搜索联系人..."
                                disabled
                                className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-xl text-gray-400 cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center text-gray-400">
                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300"/>
                            <p className="text-sm">暂无联系人数据</p>
                        </div>
                    </div>
                </div>

                {/* 右侧主要提示区域 */}
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="text-center max-w-lg p-10 bg-white rounded-3xl shadow-xl border border-blue-100">
                        {/* 图标动画 */}
                        <div className="relative mb-8">
                            <div
                                className="p-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full w-32 h-32 mx-auto flex items-center justify-center shadow-lg">
                                <MessageSquare className="h-16 w-16 text-white"/>
                            </div>
                            <div
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                <AlertCircle className="h-4 w-4 text-white"/>
                            </div>
                        </div>

                        {/* 标题和描述 */}
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">需要加载数据库</h2>
                        <p className="text-gray-600 text-base leading-relaxed mb-8">
                            要查看聊天记录，请先在数据库页面加载包含联系人信息的数据库文件
                        </p>

                        {/* 步骤指引 */}
                        <div className="bg-blue-50 rounded-2xl p-6 mb-8">
                            <h3 className="text-lg font-semibold text-blue-900 mb-4">操作步骤</h3>
                            <div className="space-y-3 text-left">
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1
                                    </div>
                                    <span className="text-blue-800">点击底部导航栏的"数据库"</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2
                                    </div>
                                    <span className="text-blue-800">添加包含联系人信息的SQLite数据库</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div
                                        className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3
                                    </div>
                                    <span className="text-blue-800">返回聊天页面查看聊天记录</span>
                                </div>
                            </div>
                        </div>

                        {/* 当前状态 */}
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                                <span>已加载数据库:</span>
                                <span className="font-bold text-gray-900">{databases.length} 个</span>
                                <span>•</span>
                                <span>联系人数据库:</span>
                                <span className="font-bold text-red-600">0 个</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex bg-gray-50 overflow-hidden">
            {/* 联系人列表 - 独立滚动 */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                {/* 联系人列表头部 - 不滚动 */}
                <div className="flex-shrink-0 p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900">聊天记录</h1>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                        <input
                            type="text"
                            placeholder="搜索联系人..."
                            value={state.searchTerm}
                            onChange={(e) => actions.setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {/* 联系人列表内容 - 独立滚动 */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {state.isLoadingContacts ? (
                        <div className="flex flex-col items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4"/>

                            {/* 加载进度 */}
                            {loadingProgress && (
                                <div className="text-center max-w-xs">
                                    <div className="text-sm text-gray-700 mb-2">
                                        {loadingProgress.message}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{width: `${loadingProgress.percentage}%`}}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {Math.round(loadingProgress.percentage)}%
                                    </div>
                                </div>
                            )}

                            {/* 取消按钮 */}
                            <button
                                onClick={cancelLoading}
                                className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    ) : state.contactsError ? (
                        <div className="p-6 text-center">
                            <div className="text-red-600 text-sm bg-red-50 rounded-lg p-4">{state.contactsError}</div>
                            <button
                                onClick={loadContacts}
                                disabled={state.isLoadingContacts}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                                重试
                            </button>
                        </div>
                    ) : state.filteredContacts.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300"/>
                                <p className="text-sm">暂无联系人</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 space-y-1">
                            {state.filteredContacts.map((contact) => {
                                const displayInfo = ContactParser.getDisplayInfo(contact);
                                const isSelected = state.selectedContact?.id === contact.id;
                                const hasCache = Boolean(state.messagesCache[contact.id]);

                                return (
                                    <button
                                        key={contact.id}
                                        onClick={() => handleSelectContact(contact)}
                                        disabled={!state.canSelectContact}
                                        className={`w-full p-4 rounded-xl transition-all text-left ${
                                            isSelected
                                                ? 'bg-blue-50 border-2 border-blue-200'
                                                : 'hover:bg-gray-50'
                                        } ${
                                            !state.canSelectContact
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Avatar name={displayInfo.name} size="lg"/>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="font-medium text-gray-900 truncate">
                                                        {displayInfo.name}
                                                    </h3>
                                                    {hasCache && (
                                                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"
                                                             title="已缓存"/>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-gray-500 truncate flex-1">
                                                        {displayInfo.subtitle}
                                                    </p>
                                                    {contact.lastActiveTime && (
                                                        <span className="text-xs text-blue-600 ml-2 flex-shrink-0">
                              {formatMessageTime(contact.lastActiveTime)}
                            </span>
                                                    )}
                                                </div>
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
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* 聊天记录区域 - 独立滚动 */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {state.selectedContact ? (
                    <>
                        {/* 聊天头部 - 不滚动 */}
                        <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <Avatar
                                        name={state.selectedContact.displayName}
                                        size="md"
                                    />
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                            {state.selectedContact.displayName}
                                            {state.isLoadingCurrentMessages && (
                                                <Loader2 className="h-4 w-4 animate-spin text-blue-600 ml-2"/>
                                            )}
                                        </h2>
                                        <p className="text-sm text-gray-600">
                                            {state.isLoadingCurrentMessages
                                                ? '加载中...'
                                                : `${state.currentMessages.length} 条消息`}
                                            {state.selectedContact.contactType !== 'user' && (
                                                <span className="ml-2 text-xs text-blue-600">
                          • {state.selectedContact.contactType === 'group' ? '群聊' : '公众号'}
                        </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClearSelection}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="返回联系人列表"
                                >
                                    <ArrowLeft className="h-5 w-5"/>
                                </button>
                            </div>
                        </div>

                        {/* 消息列表 - 独立滚动 */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                            {state.isLoadingCurrentMessages ? (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
                                </div>
                            ) : state.messagesError ? (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <div className="text-center text-red-600">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-300"/>
                                        <p className="text-sm">{state.messagesError}</p>
                                        <button
                                            onClick={() => handleSelectContact(state.selectedContact)}
                                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                        >
                                            重试加载
                                        </button>
                                    </div>
                                </div>
                            ) : state.currentMessages.length === 0 ? (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                    <div className="text-center text-gray-500">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300"/>
                                        <p>暂无聊天记录</p>
                                    </div>
                                </div>
                            ) : (
                                state.currentMessages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex items-start space-x-3 ${
                                            message.isOwn ? 'flex-row-reverse space-x-reverse' : ''
                                        }`}
                                    >
                                        {/* 发送者头像 */}
                                        <MessageAvatar
                                            name={message.senderDisplayName}
                                            isOwn={message.isOwn}
                                        />

                                        {/* 消息内容 */}
                                        <div className={`max-w-[70%] ${
                                            message.isOwn ? 'items-end' : 'items-start'
                                        } flex flex-col`}>
                                            {/* 发送者名字和时间 */}
                                            <div className={`flex items-center mb-1 space-x-2 ${
                                                message.isOwn ? 'flex-row-reverse space-x-reverse' : ''
                                            }`}>
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
                                    <span>{state.currentMessages.length} 条消息</span>
                                </div>
                                {state.currentMessages.length > 0 && (
                                    <>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4"/>
                                            <span>最早: {formatMessageTime(state.currentMessages[0].timestamp)}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4"/>
                                            <span>最新: {formatMessageTime(state.currentMessages[state.currentMessages.length - 1].timestamp)}</span>
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
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center justify-center space-x-2">
                                    <span className="text-sm text-gray-500">有聊天记录</span>
                                    <span className="text-lg font-bold text-blue-600">{state.contacts.length}</span>
                                    <span className="text-sm text-gray-500">个联系人</span>
                                </div>
                                {state.contacts.length > 0 && (
                                    <div className="text-center space-y-1">
                                        <div className="text-xs text-gray-500">
                                            按最新消息时间排序
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            消息数据库: {messageDbs.length} 个
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}