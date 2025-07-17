import { DatabaseInfo, TableInfo } from '../types';
import { dbManager } from '../api';
import { WeChatTableMatcher } from '../utils/wechatTableMatcher';

interface TableMapping {
    tableName: string;
    databaseId: string;
    databaseFilename: string;
    tableInfo: TableInfo;
}

/**
 * 表映射服务 - 管理表名到数据库文件的全局映射
 * 解决联系人聊天记录查找效率问题
 */
export class TableMappingService {
    private static instance: TableMappingService;
    private tableMap = new Map<string, TableMapping>();
    private isInitialized = false;

    static getInstance(): TableMappingService {
        if (!TableMappingService.instance) {
            TableMappingService.instance = new TableMappingService();
        }
        return TableMappingService.instance;
    }

    /**
     * 初始化表映射 - 遍历所有数据库建立映射关系
     */
    async initializeMapping(databases: DatabaseInfo[]): Promise<void> {
        console.log('🗺️ 开始初始化表映射服务...');
        console.log(`📊 传入数据库数量: ${databases.length}`);
        
        if (databases.length === 0) {
            console.warn('⚠️ 没有数据库信息，请先加载keys文件');
            this.isInitialized = false;
            return;
        }

        this.tableMap.clear();
        let totalTables = 0;
        let chatTables = 0;
        let successfulDatabases = 0;

        for (const database of databases) {
            try {
                console.log(`📊 扫描数据库: ${database.filename} (ID: ${database.id})`);
                
                // 确保数据库连接 - 使用正确的API方法
                await dbManager.connectDatabase(database.id);
                console.log(`✅ 数据库 ${database.filename} 连接成功`);
                
                // 获取数据库中的所有表
                const tables = await dbManager.getTables(database.id);
                console.log(`📋 数据库 ${database.filename} 找到 ${tables.length} 个表`);
                totalTables += tables.length;

                // 找出聊天相关的表
                const wechatChatTables = WeChatTableMatcher.findChatTables(tables);
                console.log(`💬 数据库 ${database.filename} 中找到 ${wechatChatTables.length} 个聊天相关表`);
                chatTables += wechatChatTables.length;

                // 为每个表建立映射
                let mappedTablesCount = 0;
                for (const table of tables) {
                    const mapping: TableMapping = {
                        tableName: table.name,
                        databaseId: database.id,
                        databaseFilename: database.filename,
                        tableInfo: table
                    };
                    
                    // 使用小写作为键，提高匹配成功率
                    this.tableMap.set(table.name.toLowerCase(), mapping);
                    mappedTablesCount++;
                    
                    // 如果是聊天表，也记录大写版本（为了兼容性）
                    if (wechatChatTables.some(ct => ct.name === table.name)) {
                        this.tableMap.set(table.name.toUpperCase(), mapping);
                        console.log(`🔗 聊天表映射: ${table.name} → ${database.filename}`);
                    }
                }

                successfulDatabases++;
                console.log(`✅ 数据库 ${database.filename} 完成: ${tables.length} 个表，${wechatChatTables.length} 个聊天表，${mappedTablesCount} 个映射`);

            } catch (error) {
                console.error(`❌ 扫描数据库 ${database.filename} 失败:`, error);
                // 提供更详细的错误信息
                if (error instanceof Error) {
                    console.error(`   错误详情: ${error.message}`);
                }
            }
        }

        this.isInitialized = successfulDatabases > 0;
        
        console.log(`🎉 表映射初始化完成!`);
        console.log(`📊 统计信息:`);
        console.log(`   - 成功处理数据库: ${successfulDatabases}/${databases.length}`);
        console.log(`   - 总表数量: ${totalTables}`);
        console.log(`   - 聊天表数量: ${chatTables}`);
        console.log(`   - 映射记录数: ${this.tableMap.size}`);
        
        if (this.tableMap.size === 0) {
            console.warn('⚠️ 没有建立任何表映射，请检查数据库连接和表结构');
        }
    }

    /**
     * 根据表名查找对应的数据库信息
     */
    findDatabaseForTable(tableName: string): TableMapping | null {
        if (!this.isInitialized) {
            console.warn('⚠️ 表映射服务未初始化，请先调用 initializeMapping()');
            return null;
        }

        // 优先尝试精确匹配
        let mapping = this.tableMap.get(tableName);
        if (mapping) return mapping;

        // 尝试小写匹配
        mapping = this.tableMap.get(tableName.toLowerCase());
        if (mapping) return mapping;

        // 尝试大写匹配
        mapping = this.tableMap.get(tableName.toUpperCase());
        if (mapping) return mapping;

        console.log(`🔍 未找到表 ${tableName} 的映射`);
        return null;
    }

    /**
     * 为联系人查找聊天表及其数据库
     */
    findChatTablesForContact(contact: any): Array<{
        tableName: string;
        databaseId: string;
        databaseFilename: string;
        tableInfo: TableInfo;
    }> {
        if (!this.isInitialized) {
            console.warn('⚠️ 表映射服务未初始化，无法查找聊天表');
            return [];
        }

        if (!contact) {
            console.warn('⚠️ 联系人信息为空');
            return [];
        }

        // 生成候选表名
        const candidateTableNames = WeChatTableMatcher.generateChatTableNames(contact);
        const results: Array<{
            tableName: string;
            databaseId: string;
            databaseFilename: string;
            tableInfo: TableInfo;
        }> = [];

        console.log(`🔍 为联系人 ${contact.displayName || contact.id || 'Unknown'} 查找聊天表`);
        console.log(`📝 生成候选表名: ${candidateTableNames.length} 个`);
        
        if (candidateTableNames.length === 0) {
            console.warn(`⚠️ 联系人 ${contact.displayName} 没有生成任何候选表名，请检查联系人数据`);
            return [];
        }

        // 显示前几个候选表名用于调试
        console.log(`🎯 候选表名示例: ${candidateTableNames.slice(0, 5).join(', ')}${candidateTableNames.length > 5 ? '...' : ''}`);

        for (const tableName of candidateTableNames) {
            const mapping = this.findDatabaseForTable(tableName);
            if (mapping) {
                results.push({
                    tableName: mapping.tableName,
                    databaseId: mapping.databaseId,
                    databaseFilename: mapping.databaseFilename,
                    tableInfo: mapping.tableInfo
                });
                console.log(`✅ 找到匹配表: ${mapping.tableName} (${mapping.databaseFilename})`);
            }
        }

        if (results.length === 0) {
            console.warn(`❌ 联系人 ${contact.displayName} 没有找到匹配的聊天表`);
            console.log(`🔍 可以使用诊断工具分析原因，检查：`);
            console.log(`   - 联系人标识符是否正确`);
            console.log(`   - MD5计算是否匹配数据库中的表名`);
            console.log(`   - 表映射是否包含相关的数据库`);
        } else {
            console.log(`🎉 为联系人 ${contact.displayName} 找到 ${results.length} 个匹配的聊天表`);
        }
        
        return results;
    }

    /**
     * 获取所有聊天表的统计信息
     */
    getChatTablesStats(): {
        totalTables: number;
        chatTables: number;
        databaseCount: number;
        tablesByDatabase: Map<string, number>;
    } {
        const tablesByDatabase = new Map<string, number>();
        let chatTables = 0;

        for (const [tableName, mapping] of this.tableMap) {
            // 统计每个数据库的表数量
            const currentCount = tablesByDatabase.get(mapping.databaseFilename) || 0;
            tablesByDatabase.set(mapping.databaseFilename, currentCount + 1);

            // 统计聊天表数量
            if (tableName.toLowerCase().includes('chat') || 
                tableName.toLowerCase().includes('message')) {
                chatTables++;
            }
        }

        return {
            totalTables: this.tableMap.size,
            chatTables,
            databaseCount: tablesByDatabase.size,
            tablesByDatabase
        };
    }

    /**
     * 重置映射（用于重新初始化）
     */
    reset(): void {
        this.tableMap.clear();
        this.isInitialized = false;
        console.log('🔄 表映射已重置');
    }

    /**
     * 检查服务是否已初始化
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * 获取所有映射（用于调试）
     */
    getAllMappings(): Map<string, TableMapping> {
        return new Map(this.tableMap);
    }

    /**
     * 调试方法：打印所有聊天表映射
     */
    debugPrintChatTables(): void {
        if (!this.isInitialized) {
            console.log('❌ 表映射服务未初始化');
            return;
        }

        console.log('🔍 所有聊天表映射:');
        const chatMappings = Array.from(this.tableMap.entries())
            .filter(([tableName]) => 
                tableName.toLowerCase().includes('chat') || 
                tableName.toLowerCase().includes('message')
            );

        if (chatMappings.length === 0) {
            console.log('   ❌ 没有找到聊天表映射');
            return;
        }

        chatMappings.forEach(([tableName, mapping]) => {
            console.log(`   📋 ${tableName} → ${mapping.databaseFilename}`);
        });
        
        console.log(`📊 总计: ${chatMappings.length} 个聊天表映射`);
    }

    /**
     * 调试方法：检查特定联系人的映射
     */
    debugContactMapping(contact: any): void {
        console.log(`🔍 调试联系人映射: ${contact.displayName || contact.id}`);
        console.log(`📝 联系人数据:`, {
            id: contact.id,
            displayName: contact.displayName,
            username: contact.username,
            originalId: contact.originalId
        });

        const candidateTableNames = WeChatTableMatcher.generateChatTableNames(contact);
        console.log(`🎯 生成的候选表名 (${candidateTableNames.length}个):`);
        candidateTableNames.slice(0, 10).forEach((name, index) => {
            console.log(`   ${index + 1}. ${name}`);
        });

        const results = this.findChatTablesForContact(contact);
        console.log(`✅ 找到匹配结果: ${results.length} 个`);
        results.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.tableName} (${result.databaseFilename})`);
        });
    }

    /**
     * 获取详细状态信息
     */
    getDetailedStatus(): {
        isInitialized: boolean;
        totalMappings: number;
        chatTableMappings: number;
        databaseCount: number;
        databases: string[];
    } {
        const databases = new Set<string>();
        let chatTableMappings = 0;

        for (const [tableName, mapping] of this.tableMap) {
            databases.add(mapping.databaseFilename);
            if (tableName.toLowerCase().includes('chat') || 
                tableName.toLowerCase().includes('message')) {
                chatTableMappings++;
            }
        }

        return {
            isInitialized: this.isInitialized,
            totalMappings: this.tableMap.size,
            chatTableMappings,
            databaseCount: databases.size,
            databases: Array.from(databases)
        };
    }
}