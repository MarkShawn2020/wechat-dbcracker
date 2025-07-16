import { useReducer, useCallback, useMemo } from 'react';
import { EnhancedContact } from '../utils/contactParser';
import { EnhancedMessage } from '../utils/messageParser';

// 统一状态定义
interface ChatState {
  // 数据状态
  contacts: EnhancedContact[];
  selectedContact: EnhancedContact | null;
  
  // 消息缓存 - 按联系人ID缓存消息，实现流畅切换
  messagesCache: Record<string, EnhancedMessage[]>;
  
  // 加载状态
  contactsPhase: 'idle' | 'loading' | 'ready' | 'error';
  messagesPhase: 'idle' | 'loading' | 'ready' | 'error';
  
  // 当前正在加载消息的联系人ID
  loadingMessagesForContact: string | null;
  
  // 错误状态
  contactsError: string | null;
  messagesError: string | null;
  
  // 连接状态
  connectedDatabases: Set<string>;
  
  // 搜索状态
  searchTerm: string;
}

// 统一动作定义
type ChatAction =
  | { type: 'START_LOADING_CONTACTS' }
  | { type: 'CONTACTS_LOADED'; contacts: EnhancedContact[] }
  | { type: 'CONTACTS_ERROR'; error: string }
  | { type: 'SELECT_CONTACT'; contact: EnhancedContact | null }
  | { type: 'START_LOADING_MESSAGES'; contactId: string }
  | { type: 'MESSAGES_LOADED'; contactId: string; messages: EnhancedMessage[] }
  | { type: 'MESSAGES_ERROR'; contactId: string; error: string }
  | { type: 'SET_SEARCH_TERM'; term: string }
  | { type: 'ADD_CONNECTED_DB'; dbId: string }
  | { type: 'CLEAR_CONTACTS_ERROR' }
  | { type: 'CLEAR_MESSAGES_ERROR' };

// 状态机reducer - 原子性更新
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'START_LOADING_CONTACTS':
      return {
        ...state,
        contactsPhase: 'loading',
        contactsError: null
      };
      
    case 'CONTACTS_LOADED':
      return {
        ...state,
        contactsPhase: 'ready',
        contacts: action.contacts,
        contactsError: null
      };
      
    case 'CONTACTS_ERROR':
      return {
        ...state,
        contactsPhase: 'error',
        contactsError: action.error
      };
      
    case 'SELECT_CONTACT':
      // 立即切换选中的联系人，不需要等待消息加载
      return {
        ...state,
        selectedContact: action.contact,
        messagesError: null // 清除之前的消息错误
      };
      
    case 'START_LOADING_MESSAGES':
      return {
        ...state,
        messagesPhase: 'loading',
        loadingMessagesForContact: action.contactId,
        messagesError: null
      };
      
    case 'MESSAGES_LOADED':
      // 只有当前选中联系人的消息才更新状态
      if (action.contactId === state.selectedContact?.id) {
        return {
          ...state,
          messagesPhase: 'ready',
          loadingMessagesForContact: null,
          messagesCache: {
            ...state.messagesCache,
            [action.contactId]: action.messages
          }
        };
      } else {
        // 如果用户已经切换到其他联系人，只缓存消息，不更新UI状态
        return {
          ...state,
          messagesCache: {
            ...state.messagesCache,
            [action.contactId]: action.messages
          },
          // 如果这是后台加载完成，清除对应的加载状态
          loadingMessagesForContact: state.loadingMessagesForContact === action.contactId 
            ? null 
            : state.loadingMessagesForContact
        };
      }
      
    case 'MESSAGES_ERROR':
      // 只有当前选中联系人的错误才影响UI
      if (action.contactId === state.selectedContact?.id) {
        return {
          ...state,
          messagesPhase: 'error',
          loadingMessagesForContact: null,
          messagesError: action.error
        };
      } else {
        // 其他联系人的错误只清除加载状态
        return {
          ...state,
          loadingMessagesForContact: state.loadingMessagesForContact === action.contactId 
            ? null 
            : state.loadingMessagesForContact
        };
      }
      
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        searchTerm: action.term
      };
      
    case 'ADD_CONNECTED_DB':
      return {
        ...state,
        connectedDatabases: new Set([...state.connectedDatabases, action.dbId])
      };
      
    case 'CLEAR_CONTACTS_ERROR':
      return {
        ...state,
        contactsError: null
      };
      
    case 'CLEAR_MESSAGES_ERROR':
      return {
        ...state,
        messagesError: null
      };
      
    default:
      return state;
  }
}

// 初始状态
const initialState: ChatState = {
  contacts: [],
  selectedContact: null,
  messagesCache: {},
  contactsPhase: 'idle',
  messagesPhase: 'idle',
  loadingMessagesForContact: null,
  contactsError: null,
  messagesError: null,
  connectedDatabases: new Set(),
  searchTerm: ''
};

// 统一状态管理Hook
export function useChatState() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  
  // 派生状态 - 使用 useMemo 优化性能
  const derivedState = useMemo(() => {
    const currentMessages = state.selectedContact 
      ? state.messagesCache[state.selectedContact.id] || []
      : [];
      
    const isLoadingCurrentMessages = state.selectedContact 
      ? state.loadingMessagesForContact === state.selectedContact.id
      : false;
      
    const hasCurrentMessages = state.selectedContact 
      ? Boolean(state.messagesCache[state.selectedContact.id])
      : false;
      
    const filteredContacts = state.contacts.filter(contact => 
      contact.displayName.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      contact.nickname?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      contact.remark?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      contact.username?.toLowerCase().includes(state.searchTerm.toLowerCase())
    );
    
    return {
      ...state,
      // 当前选中联系人的消息
      currentMessages,
      // 是否正在为当前联系人加载消息
      isLoadingCurrentMessages,
      // 当前联系人是否有缓存的消息
      hasCurrentMessages,
      // 过滤后的联系人列表
      filteredContacts,
      // 便捷的加载状态
      isLoadingContacts: state.contactsPhase === 'loading',
      canSelectContact: state.contactsPhase === 'ready',
      // 是否可以立即显示消息（有缓存或正在加载）
      canShowMessages: hasCurrentMessages || isLoadingCurrentMessages
    };
  }, [state]);
  
  // 统一的动作创建器
  const actions = {
    startLoadingContacts: useCallback(() => 
      dispatch({ type: 'START_LOADING_CONTACTS' }), []),
    
    contactsLoaded: useCallback((contacts: EnhancedContact[]) => 
      dispatch({ type: 'CONTACTS_LOADED', contacts }), []),
    
    contactsError: useCallback((error: string) => 
      dispatch({ type: 'CONTACTS_ERROR', error }), []),
    
    selectContact: useCallback((contact: EnhancedContact | null) => 
      dispatch({ type: 'SELECT_CONTACT', contact }), []),
    
    startLoadingMessages: useCallback((contactId: string) => 
      dispatch({ type: 'START_LOADING_MESSAGES', contactId }), []),
    
    messagesLoaded: useCallback((contactId: string, messages: EnhancedMessage[]) => 
      dispatch({ type: 'MESSAGES_LOADED', contactId, messages }), []),
    
    messagesError: useCallback((contactId: string, error: string) => 
      dispatch({ type: 'MESSAGES_ERROR', contactId, error }), []),
    
    setSearchTerm: useCallback((term: string) => 
      dispatch({ type: 'SET_SEARCH_TERM', term }), []),
    
    addConnectedDb: useCallback((dbId: string) => 
      dispatch({ type: 'ADD_CONNECTED_DB', dbId }), []),
    
    clearContactsError: useCallback(() => 
      dispatch({ type: 'CLEAR_CONTACTS_ERROR' }), []),
    
    clearMessagesError: useCallback(() => 
      dispatch({ type: 'CLEAR_MESSAGES_ERROR' }), [])
  };
  
  return {
    state: derivedState,
    actions
  };
}