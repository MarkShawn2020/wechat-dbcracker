import {dbManager} from '../api';
import {ContactParser, EnhancedContact} from '../utils/contactParser';
import {EnhancedMessage, MessageParser} from '../utils/messageParser';
import {WeChatTableMatcher} from '../utils/wechatTableMatcher';
import {TableMappingService} from './tableMappingService';
import {DatabaseInfo} from '../types';

export class ChatDataService {
    private static connectedDatabases = new Set<string>();

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

                // 首先尝试使用MD5映射找到对应的聊天表
                const matchedTables = WeChatTableMatcher.findMatchingChatTables(contact, validChatTables);
                console.log(`为联系人 ${contact.displayName} 找到 ${matchedTables.length} 个匹配的聊天表:`, 
                    matchedTables.map(t => t.name));

                // 如果找到匹配的表，优先使用匹配的表
                const tablesToCheck = matchedTables.length > 0 ? matchedTables : validChatTables;
                console.log(`将检查 ${tablesToCheck.length} 个聊天表`);

                // 遍历需要检查的聊天表
                for (const chatTable of tablesToCheck) {
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
        sampleSize: number = 500, // 大幅减少采样数量
        onProgress?: (current: number, total: number, message: string) => void,
        cancellationToken?: { cancelled: boolean }
    ): Promise<Map<string, string>> {
        const {PerformanceOptimizer, CancellableOperation} = await import('../utils/PerformanceOptimizer');

        console.log(`🚀 开始高性能活跃度检测，数据库数量: ${messageDbs.length}`);

        const operation = new CancellableOperation(30000); // 30秒超时

        // 如果有取消标记，关联到操作
        if (cancellationToken) {
            const checkCancellation = setInterval(() => {
                if (cancellationToken.cancelled) {
                    operation.cancel();
                    clearInterval(checkCancellation);
                }
            }, 100);
        }

        try {
            const activityMap = await PerformanceOptimizer.memoryFriendlyActivityDetection(
                dbManager,
                messageDbs,
                operation,
                onProgress
            );

            console.log(`📊 高性能活跃度检测完成，找到 ${activityMap.size} 个活跃联系人`);
            return activityMap;

        } catch (error) {
            if (error.message.includes('cancelled')) {
                console.log('🚫 活跃度检测被用户取消');
                throw new Error('操作被取消');
            }
            throw error;
        }
    }

    /**
     * 快速加载并排序联系人 - 基于启发式活跃度
     */
    static async loadContactsWithHeuristicSorting(
        contactDb: DatabaseInfo,
        messageDbs: DatabaseInfo[],
        onProgress?: (message: string, percentage: number) => void,
        cancellationToken?: { cancelled: boolean }
    ): Promise<EnhancedContact[]> {
        if (cancellationToken?.cancelled) {
            throw new Error('操作被取消');
        }

        onProgress?.('加载联系人数据...', 10);

        // 先快速加载联系人
        const contacts = await this.loadContacts(contactDb);

        if (cancellationToken?.cancelled) {
            throw new Error('操作被取消');
        }

        onProgress?.('分析聊天记录活跃度...', 30);

        // 获取活跃度信息
        const activityMap = await this.getActiveContactsHeuristic(
            messageDbs,
            500, // 减少采样数量
            (current, total, message) => {
                const percentage = 30 + (current / total) * 50; // 30-80%
                onProgress?.(`${message} (${current}/${total})`, percentage);
            },
            cancellationToken
        );

        if (cancellationToken?.cancelled) {
            throw new Error('操作被取消');
        }

        onProgress?.('匹配联系人活跃度...', 85);

        // 为联系人匹配活跃度信息
        console.log(`👥 开始为 ${contacts.length} 个联系人匹配活跃度信息`);
        console.log(`🔍 活跃度映射表大小: ${activityMap.size}`);

        const contactsWithActivity = contacts.map((contact, index) => {
            const identifiers = [contact.originalId, contact.username, contact.id].filter(Boolean) as string[];
            let lastActiveTime: string | undefined;

            // 找到该联系人的最新活跃时间
            for (const identifier of identifiers) {
                const time = activityMap.get(identifier);
                if (time && (!lastActiveTime || time > lastActiveTime)) {
                    lastActiveTime = time;
                }
            }

            // 如果没有找到精确匹配，尝试模糊匹配（只对前100个联系人进行模糊匹配以提高性能）
            if (!lastActiveTime && index < 100) {
                for (const [activityId, time] of activityMap) {
                    if (identifiers.some(id => activityId.includes(id) || id.includes(activityId))) {
                        if (!lastActiveTime || time > lastActiveTime) {
                            lastActiveTime = time;
                        }
                    }
                }
            }

            return {
                ...contact,
                lastActiveTime
            };
        });

        if (cancellationToken?.cancelled) {
            throw new Error('操作被取消');
        }

        onProgress?.('排序联系人...', 95);

        const activeContacts = contactsWithActivity.filter(c => c.lastActiveTime);
        console.log(`📊 匹配结果: ${activeContacts.length}/${contacts.length} 个联系人有活跃时间`);

        // 智能排序：活跃联系人在前，按时间倒序；非活跃的按名字排序
        const sortedContacts = contactsWithActivity.sort((a, b) => {
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

        onProgress?.('完成', 100);

        return sortedContacts;
    }

    /**
     * 仅加载有聊天记录的联系人 - 用于聊天页面
     */
    static async loadContactsWithChatHistory(
        contactDb: DatabaseInfo,
        messageDbs: DatabaseInfo[],
        onProgress?: (message: string, percentage: number) => void,
        cancellationToken?: { cancelled: boolean }
    ): Promise<EnhancedContact[]> {
        console.log(`🎯 开始加载有聊天记录的联系人`);
        console.log(`📁 联系人数据库: ${contactDb.filename}`);
        console.log(`📁 消息数据库: ${messageDbs.map(db => db.filename).join(', ')}`);

        onProgress?.('准备加载联系人...', 0);

        if (cancellationToken?.cancelled) {
            throw new Error('操作被取消');
        }

        const contactsWithActivity = await this.loadContactsWithHeuristicSorting(
            contactDb,
            messageDbs,
            onProgress,
            cancellationToken
        );

        if (cancellationToken?.cancelled) {
            throw new Error('操作被取消');
        }

        // 只返回有聊天记录的联系人（lastActiveTime存在）
        const activeContacts = contactsWithActivity.filter(contact => contact.lastActiveTime);

        console.log(`📊 最终结果: ${activeContacts.length}/${contactsWithActivity.length} 个联系人有聊天记录`);

        if (activeContacts.length === 0) {
            console.warn(`⚠️ 没有找到任何有聊天记录的联系人！`);
            onProgress?.('尝试备用方案...', 90);

            // 备用方案：直接从聊天表中提取联系人
            const directContacts = await this.loadContactsDirectFromChatTables(contactDb, messageDbs);
            console.log(`🔄 备用方案找到 ${directContacts.length} 个联系人`);
            return directContacts;
        }

        return activeContacts;
    }

    /**
     * 备用方案：直接从聊天表中提取联系人
     */
    static async loadContactsDirectFromChatTables(
        contactDb: DatabaseInfo,
        messageDbs: DatabaseInfo[]
    ): Promise<EnhancedContact[]> {
        console.log(`🔄 执行备用方案：直接从聊天表中提取联系人`);

        // 首先加载所有联系人
        const allContacts = await this.loadContacts(contactDb);
        console.log(`👥 加载了 ${allContacts.length} 个联系人`);

        // 从聊天表中提取联系人ID
        const chatContactIds = new Set<string>();

        for (const messageDb of messageDbs) {
            try {
                await this.ensureConnected(messageDb.id);
                const tables = await dbManager.getTables(messageDb.id);
                const chatTables = WeChatTableMatcher.findChatTables(tables);

                for (const chatTable of chatTables) {
                    try {
                        const result = await dbManager.queryTable(messageDb.id, chatTable.name, 100);
                        console.log(`📋 表 ${chatTable.name} 有 ${result.rows.length} 条记录`);

                        result.rows.forEach(row => {
                            // 尝试从每个字段提取可能的联系人ID
                            row.forEach(field => {
                                if (field && typeof field === 'string' && field.trim() !== '') {
                                    chatContactIds.add(field.trim());
                                }
                            });
                        });
                    } catch (err) {
                        console.warn(`❌ 处理表 ${chatTable.name} 失败:`, err);
                    }
                }
            } catch (err) {
                console.warn(`❌ 处理数据库 ${messageDb.filename} 失败:`, err);
            }
        }

        console.log(`📊 从聊天表中提取了 ${chatContactIds.size} 个唯一联系人ID`);

        // 匹配联系人
        const matchedContacts = allContacts.filter(contact => {
            const identifiers = [contact.originalId, contact.username, contact.id].filter(Boolean);
            return identifiers.some(id => chatContactIds.has(id));
        });

        console.log(`📊 匹配到 ${matchedContacts.length} 个联系人`);

        return matchedContacts.sort((a, b) =>
            a.displayName.localeCompare(b.displayName, 'zh-CN')
        );
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

    /**
     * 优化版：加载指定联系人的消息（使用表映射服务）
     * 直接定位到包含聊天记录的数据库文件，避免遍历所有数据库
     */
    static async loadMessagesOptimized(
        contact: EnhancedContact,
        allContacts: EnhancedContact[]
    ): Promise<EnhancedMessage[]> {
        console.log(`🔍 开始加载联系人 ${contact.displayName} 的聊天记录（优化版）`);
        
        const mappingService = TableMappingService.getInstance();
        
        // 检查映射服务是否已初始化
        if (!mappingService.isReady()) {
            console.warn('⚠️ 表映射服务未初始化，无法使用优化加载');
            return [];
        }

        const allMessages: EnhancedMessage[] = [];
        let globalMessageIndex = 0;

        try {
            // 直接查找联系人对应的聊天表
            const chatTableMappings = mappingService.findChatTablesForContact(contact);
            
            if (chatTableMappings.length === 0) {
                console.log(`📭 未找到联系人 ${contact.displayName} 的聊天表`);
                return [];
            }

            console.log(`📋 找到 ${chatTableMappings.length} 个相关聊天表`);

            // 遍历每个匹配的聊天表
            for (const mapping of chatTableMappings) {
                console.log(`📖 读取表: ${mapping.tableName} (${mapping.databaseFilename})`);
                
                try {
                    // 确保数据库已连接
                    await this.ensureConnected(mapping.databaseId);

                    // 验证表是否有效
                    const isValid = await WeChatTableMatcher.validateChatTable(
                        mapping.databaseId,
                        mapping.tableName,
                        dbManager
                    );

                    if (!isValid) {
                        console.log(`⚠️ 表 ${mapping.tableName} 验证失败，跳过`);
                        continue;
                    }

                    // 分批加载消息
                    const batchSize = 1000;
                    let offset = 0;
                    let hasMore = true;
                    let tableMessageCount = 0;

                    while (hasMore) {
                        const result = await dbManager.queryTable(
                            mapping.databaseId, 
                            mapping.tableName, 
                            batchSize, 
                            offset
                        );

                        if (result.rows.length === 0) {
                            break;
                        }

                        // 解析消息
                        const messagesData = MessageParser.parseMessages(
                            result,
                            contact,
                            allContacts,
                            mapping.databaseId,
                            globalMessageIndex
                        );

                        if (messagesData.length > 0) {
                            allMessages.push(...messagesData);
                            tableMessageCount += messagesData.length;
                            globalMessageIndex += messagesData.length;
                        }

                        offset += batchSize;
                        hasMore = result.rows.length === batchSize;

                        // 避免无限循环
                        if (offset > 100000) {
                            console.warn(`⚠️ 表 ${mapping.tableName} 数据量过大，停止加载`);
                            break;
                        }
                    }

                    console.log(`✓ 表 ${mapping.tableName} 加载完成，找到 ${tableMessageCount} 条消息`);

                } catch (tableError) {
                    console.warn(`❌ 读取表 ${mapping.tableName} 失败:`, tableError);
                }
            }

            // 按时间排序
            allMessages.sort((a, b) => {
                const timeA = a.timestamp || 0;
                const timeB = b.timestamp || 0;
                return timeA - timeB;
            });

            console.log(`🎉 联系人 ${contact.displayName} 聊天记录加载完成，总计 ${allMessages.length} 条消息`);
            return allMessages;

        } catch (error) {
            console.error(`❌ 加载联系人 ${contact.displayName} 聊天记录失败:`, error);
            return [];
        }
    }

    /**
     * 初始化表映射服务
     */
    static async initializeTableMapping(databases: DatabaseInfo[]): Promise<void> {
        console.log('🚀 初始化表映射服务...');
        const mappingService = TableMappingService.getInstance();
        await mappingService.initializeMapping(databases);
        console.log('✅ 表映射服务初始化完成');
    }

    /**
     * 获取表映射统计信息
     */
    static getTableMappingStats() {
        const mappingService = TableMappingService.getInstance();
        return mappingService.getChatTablesStats();
    }

    /**
     * 调试方法：获取详细的表映射状态
     */
    static getDetailedMappingStatus() {
        const mappingService = TableMappingService.getInstance();
        return mappingService.getDetailedStatus();
    }

    /**
     * 调试方法：打印所有聊天表映射
     */
    static debugPrintChatTables() {
        const mappingService = TableMappingService.getInstance();
        mappingService.debugPrintChatTables();
    }

    /**
     * 调试方法：检查特定联系人的映射
     */
    static debugContactMapping(contact: EnhancedContact) {
        const mappingService = TableMappingService.getInstance();
        mappingService.debugContactMapping(contact);
    }

    /**
     * 连接数据库（如果尚未连接）
     */
    private static async ensureConnected(dbId: string): Promise<void> {
        if (!this.connectedDatabases.has(dbId)) {
            await dbManager.connectDatabase(dbId);
            this.connectedDatabases.add(dbId);
        }
    }
}