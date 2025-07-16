import { useEffect, useCallback, useState } from 'react';
import { Users, Search, Loader2, AlertCircle } from 'lucide-react';
import { useAtom } from 'jotai';
import { databasesAtom } from '../store/atoms';
import { Avatar } from '../components/Avatar';
import { ContactParser, EnhancedContact } from '../utils/contactParser';
import { ChatDataService } from '../services/chatDataService';

export function ContactsPage() {
  const [databases] = useAtom(databasesAtom);
  const [contacts, setContacts] = useState<EnhancedContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<EnhancedContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 获取联系人数据库
  const contactDb = databases.find(db => db.db_type === 'Contact');

  // 加载联系人数据
  const loadContacts = useCallback(async () => {
    if (!contactDb) {
      setError('未找到Contact类型的数据库');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const loadedContacts = await ChatDataService.loadContacts(contactDb);
      
      // 按ASCII顺序排序（显示名称）
      const sortedContacts = loadedContacts.sort((a, b) => 
        a.displayName.localeCompare(b.displayName)
      );
      
      setContacts(sortedContacts);
      setFilteredContacts(sortedContacts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载联系人失败';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [contactDb]);

  // 搜索联系人
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts);
    } else {
      const filtered = ContactParser.searchContacts(contacts, searchTerm);
      setFilteredContacts(filtered);
    }
  }, [contacts, searchTerm]);

  // 初始化加载
  useEffect(() => {
    if (contactDb && contacts.length === 0 && !isLoading) {
      loadContacts();
    }
  }, [contactDb, contacts.length, isLoading, loadContacts]);

  // 格式化联系人统计信息
  const getContactsStats = () => {
    const userCount = contacts.filter(c => c.contactType === 'user').length;
    const groupCount = contacts.filter(c => c.contactType === 'group').length;
    const officialCount = contacts.filter(c => c.contactType === 'official').length;
    
    return { userCount, groupCount, officialCount };
  };

  // 无联系人数据库的错误状态
  if (!contactDb) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center max-w-lg p-10 bg-white rounded-3xl shadow-xl border border-blue-100">
          <div className="relative mb-8">
            <div className="p-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full w-32 h-32 mx-auto flex items-center justify-center shadow-lg">
              <Users className="h-16 w-16 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">需要加载数据库</h2>
          <p className="text-gray-600 text-base leading-relaxed mb-8">
            要查看联系人，请先在数据库页面加载包含联系人信息的数据库文件
          </p>
          
          <div className="bg-blue-50 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">操作步骤</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-blue-800">点击底部导航栏的"数据库"</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-blue-800">添加包含联系人信息的SQLite数据库</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-blue-800">返回联系人页面查看所有联系人</span>
              </div>
            </div>
          </div>
          
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
    );
  }

  const stats = getContactsStats();

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* 页面头部 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">联系人</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>总计: {contacts.length} 个</span>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索联系人..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        
        {/* 统计信息 */}
        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>用户: {stats.userCount}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>群聊: {stats.groupCount}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>公众号: {stats.officialCount}</span>
          </div>
        </div>
      </div>

      {/* 联系人列表 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">正在加载联系人...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadContacts}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{searchTerm ? '没有找到匹配的联系人' : '暂无联系人'}</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => {
                const displayInfo = ContactParser.getDisplayInfo(contact);
                
                return (
                  <div
                    key={contact.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar name={displayInfo.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {displayInfo.name}
                          </h3>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            contact.contactType === 'user'
                              ? 'bg-blue-100 text-blue-700'
                              : contact.contactType === 'group'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {contact.contactType === 'user' ? '用户' : 
                             contact.contactType === 'group' ? '群聊' : '公众号'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {displayInfo.subtitle}
                        </p>
                        {contact.phoneNumber && (
                          <p className="text-xs text-gray-400 mt-1">
                            📞 {contact.phoneNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}