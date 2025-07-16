import { TableInfo } from '../types';

/**
 * 微信表匹配工具 - 精确识别微信数据库中的各种表
 */
export class WeChatTableMatcher {
  
  /**
   * 查找微信聊天记录表 (chat_xxx)
   * 微信聊天记录通常存储在以 chat_ 开头的表中
   */
  static findChatTables(tables: TableInfo[]): TableInfo[] {
    const chatTables = tables.filter(table => {
      const name = table.name.toLowerCase();
      
      // 精确匹配微信聊天表模式
      return (
        name.startsWith('chat_') ||                    // chat_xxx (主要聊天表)
        name === 'chat' ||                            // 简单的 chat 表
        name.match(/^chat\d+$/) ||                    // chat123 格式
        name.startsWith('chatroom_') ||               // 群聊表
        name.startsWith('message_') ||                // message_xxx
        (name.includes('chat') && name.includes('room')) // 包含 chat 和 room 的表
      );
    });

    console.log(`找到 ${chatTables.length} 个聊天相关表:`, chatTables.map(t => t.name));
    
    // 按优先级排序：chat_ 开头的表优先
    return chatTables.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      if (aName.startsWith('chat_') && !bName.startsWith('chat_')) return -1;
      if (!aName.startsWith('chat_') && bName.startsWith('chat_')) return 1;
      
      return aName.localeCompare(bName);
    });
  }
  
  /**
   * 查找联系人表
   */
  static findContactTables(tables: TableInfo[]): TableInfo[] {
    return tables.filter(table => {
      const name = table.name.toLowerCase();
      
      return (
        name.includes('contact') ||
        name.includes('wccontact') ||
        name.includes('friend') ||
        name.includes('user')
      );
    });
  }
  
  /**
   * 验证表是否是有效的聊天记录表
   * 通过检查表的字段来验证
   */
  static async validateChatTable(
    dbId: string, 
    tableName: string, 
    dbManager: any
  ): Promise<boolean> {
    try {
      // 查询表结构和少量数据来验证
      const result = await dbManager.queryTable(dbId, tableName, 5);
      
      if (result.rows.length === 0) {
        console.log(`表 ${tableName} 无数据`);
        return false;
      }
      
      const columns = result.columns.map(col => col.toLowerCase());
      
      // 检查是否包含聊天记录的关键字段
      const hasRequiredFields = (
        columns.some(col => ['talker', 'sender', 'fromuser'].includes(col)) &&
        columns.some(col => col.includes('time')) &&
        columns.some(col => ['content', 'message', 'msg'].some(keyword => col.includes(keyword)))
      );
      
      if (!hasRequiredFields) {
        console.log(`表 ${tableName} 缺少必要的聊天字段，字段:`, columns);
        return false;
      }
      
      console.log(`✓ 表 ${tableName} 验证通过，字段:`, columns);
      return true;
      
    } catch (err) {
      console.warn(`验证表 ${tableName} 失败:`, err);
      return false;
    }
  }
  
  /**
   * 获取所有有效的聊天表
   */
  static async getValidChatTables(
    dbId: string,
    tables: TableInfo[],
    dbManager: any
  ): Promise<TableInfo[]> {
    const chatTables = this.findChatTables(tables);
    const validTables: TableInfo[] = [];
    
    for (const table of chatTables) {
      const isValid = await this.validateChatTable(dbId, table.name, dbManager);
      if (isValid) {
        validTables.push(table);
      }
    }
    
    console.log(`数据库中有效的聊天表: ${validTables.length}/${chatTables.length}`, 
                validTables.map(t => t.name));
    
    return validTables;
  }
  
  /**
   * 检查数据库是否包含微信数据
   */
  static async isWeChatDatabase(
    dbId: string,
    tables: TableInfo[],
    dbManager: any
  ): Promise<boolean> {
    const chatTables = this.findChatTables(tables);
    const contactTables = this.findContactTables(tables);
    
    // 如果有 chat 表或 contact 表，很可能是微信数据库
    if (chatTables.length > 0 || contactTables.length > 0) {
      return true;
    }
    
    // 检查是否有其他微信特有的表名
    const wechatKeywords = ['wechat', 'wx', 'msg', 'chatroom', 'session'];
    const hasWeChatTables = tables.some(table =>
      wechatKeywords.some(keyword => 
        table.name.toLowerCase().includes(keyword)
      )
    );
    
    return hasWeChatTables;
  }
}