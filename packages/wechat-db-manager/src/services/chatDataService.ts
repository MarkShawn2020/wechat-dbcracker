import { dbManager } from '../api';
import { ContactParser, EnhancedContact } from '../utils/contactParser';
import { MessageParser, EnhancedMessage } from '../utils/messageParser';
import { WeChatTableMatcher } from '../utils/wechatTableMatcher';
import { DatabaseInfo } from '../types';

export class ChatDataService {
  private static connectedDatabases = new Set<string>();
  
  /**
   * 连接数据库（如果尚未连接）
   */
  private static async ensureConnected(dbId: string): Promise<void> {
    if (!this.connectedDatabases.has(dbId)) {
      await dbManager.connectDatabase(dbId);
      this.connectedDatabases.add(dbId);
    }
  }
  
  /**
   * 加载所有联系人
   */
  static async loadContacts(contactDb: DatabaseInfo): Promise<EnhancedContact[]> {
    await this.ensureConnected(contactDb.id);
    
    const tables = await dbManager.getTables(contactDb.id);
    const contactTable = tables.find(t =>
      t.name.toLowerCase().includes('contact') ||
      t.name.toLowerCase().includes('wccontact')
    );
    
    if (!contactTable) {
      throw new Error('未找到联系人表');
    }
    
    const result = await dbManager.queryTable(contactDb.id, contactTable.name);
    return ContactParser.parseContacts(result);
  }
  
  /**
   * 加载指定联系人的消息
   */
  static async loadMessages(
    contact: EnhancedContact,
    messageDbs: DatabaseInfo[],
    allContacts: EnhancedContact[]
  ): Promise<EnhancedMessage[]> {
    const allMessages: EnhancedMessage[] = [];
    let globalMessageIndex = 0;
    
    for (const messageDb of messageDbs) {
      try {
        await this.ensureConnected(messageDb.id);
        
        const tables = await dbManager.getTables(messageDb.id);
        
        // 使用专业的微信表匹配器查找并验证聊天表
        const validChatTables = await WeChatTableMatcher.getValidChatTables(
          messageDb.id, 
          tables, 
          dbManager
        );
        
        if (validChatTables.length === 0) {
          console.warn(`数据库 ${messageDb.filename} 中未找到有效的聊天表`);
          continue;
        }
        
        console.log(`数据库 ${messageDb.filename} 中找到 ${validChatTables.length} 个有效聊天表:`, 
                   validChatTables.map(t => t.name));
        
        // 遍历所有有效的 chat 表，查找该联系人的消息
        for (const chatTable of validChatTables) {
          console.log(`检查聊天表: ${chatTable.name}`);
          
          try {
            // 分批加载消息，避免一次性加载过多数据
            const batchSize = 1000;
            let offset = 0;
            let hasMore = true;
            
            while (hasMore) {
              const result = await dbManager.queryTable(messageDb.id, chatTable.name, batchSize, offset);
              if (result.rows.length === 0) break;
              
              const messagesData = MessageParser.parseMessages(
                result,
                contact,
                allContacts,
                messageDb.id,
                globalMessageIndex
              );
              
              // 只有找到消息才记录和更新索引
              if (messagesData.length > 0) {
                console.log(`在表 ${chatTable.name} 中找到 ${messagesData.length} 条消息`);
                globalMessageIndex += messagesData.length;
                allMessages.push(...messagesData);
              }
              
              // 如果返回的记录数少于批次大小，说明已经没有更多数据
              hasMore = result.rows.length === batchSize;
              offset += batchSize;
              
              // 为了避免单个联系人加载过多数据，设置一个合理的上限
              if (allMessages.length >= 10000) break;
            }
          } catch (tableErr) {
            console.warn(`读取聊天表 ${chatTable.name} 失败:`, tableErr);
          }
        }
      } catch (err) {
        // 单个数据库失败不影响其他数据库
        console.warn(`加载消息数据库 ${messageDb.filename} 失败:`, err);
      }
    }
    
    // 按时间排序
    allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return allMessages;
  }
  
  /**
   * 高性能：启发式获取活跃联系人排序
   * 策略：从最新消息中采样，快速识别活跃联系人
   */
  static async getActiveContactsHeuristic(
    messageDbs: DatabaseInfo[],
    sampleSize: number = 2000
  ): Promise<Map<string, string>> {
    const contactActivityMap = new Map<string, string>();
    
    for (const messageDb of messageDbs) {
      try {
        await this.ensureConnected(messageDb.id);
        
        const tables = await dbManager.getTables(messageDb.id);
        
        // 使用专业的微信表匹配器查找聊天表（启发式采样无需完整验证）
        const chatTables = WeChatTableMatcher.findChatTables(tables);
        
        if (chatTables.length === 0) {
          console.warn(`启发式采样 - 数据库 ${messageDb.filename} 中未找到聊天表`);
          continue;
        }
        
        console.log(`启发式采样 - 数据库 ${messageDb.filename} 中找到 ${chatTables.length} 个聊天表:`, 
                   chatTables.map(t => t.name));
        
        // 遍历所有 chat 表进行采样
        for (const chatTable of chatTables) {
          console.log(`启发式采样 - 使用聊天表: ${chatTable.name}`);
          
          try {
            // 只查询最新的N条消息，快速采样
            const query = `SELECT talker, sender, fromuser, timestamp, createtime 
                          FROM ${chatTable.name} 
                          ORDER BY timestamp DESC, createtime DESC 
                          LIMIT ${Math.floor(sampleSize / chatTables.length)}`;
            
            const result = await dbManager.executeQuery(messageDb.id, query);
            
            result.rows.forEach(row => {
              // 提取联系人标识符和时间戳
              const talker = row[0];
              const sender = row[1]; 
              const fromuser = row[2];
              const timestamp = row[3] || row[4];
              
              if (timestamp) {
                const timestampStr = String(timestamp);
                const contactIds = [talker, sender, fromuser].filter(Boolean);
                
                contactIds.forEach(contactId => {
                  const currentTime = contactActivityMap.get(contactId);
                  if (!currentTime || timestampStr > currentTime) {
                    contactActivityMap.set(contactId, timestampStr);
                  }
                });
              }
            });
          } catch (tableErr) {
            console.warn(`处理聊天表 ${chatTable.name} 失败:`, tableErr);
          }
        }
      } catch (err) {
        console.warn(`处理消息数据库 ${messageDb.filename} 时出错:`, err);
      }
    }
    
    return contactActivityMap;
  }
  
  /**
   * 快速加载并排序联系人 - 基于启发式活跃度
   */
  static async loadContactsWithHeuristicSorting(
    contactDb: DatabaseInfo,
    messageDbs: DatabaseInfo[]
  ): Promise<EnhancedContact[]> {
    // 并行执行：加载联系人 + 获取活跃度信息
    const [contacts, activityMap] = await Promise.all([
      this.loadContacts(contactDb),
      this.getActiveContactsHeuristic(messageDbs)
    ]);
    
    // 为联系人匹配活跃度信息
    const contactsWithActivity = contacts.map(contact => {
      const identifiers = [contact.originalId, contact.username].filter(Boolean);
      let lastActiveTime: string | undefined;
      
      // 找到该联系人的最新活跃时间
      for (const identifier of identifiers) {
        const time = activityMap.get(identifier);
        if (time && (!lastActiveTime || time > lastActiveTime)) {
          lastActiveTime = time;
        }
      }
      
      return {
        ...contact,
        lastActiveTime
      };
    });
    
    // 智能排序：活跃联系人在前，按时间倒序；非活跃的按名字排序
    return contactsWithActivity.sort((a, b) => {
      const aTime = a.lastActiveTime;
      const bTime = b.lastActiveTime;
      
      // 都有活跃时间：按时间倒序
      if (aTime && bTime) {
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      
      // 只有a活跃：a排前面
      if (aTime && !bTime) return -1;
      
      // 只有b活跃：b排前面  
      if (!aTime && bTime) return 1;
      
      // 都不活跃：按显示名排序
      return a.displayName.localeCompare(b.displayName, 'zh-CN');
    });
  }
  
  
  /**
   * 检查是否已连接到数据库
   */
  static isConnected(dbId: string): boolean {
    return this.connectedDatabases.has(dbId);
  }
  
  /**
   * 获取已连接的数据库列表
   */
  static getConnectedDatabases(): string[] {
    return Array.from(this.connectedDatabases);
  }
}