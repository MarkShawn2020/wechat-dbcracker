import {DatabaseInfo} from '../types';
import {dbManager} from '../api';

export interface AutoConnectSettings {
    enableAutoConnect: boolean;
    lastConnectedDatabases: DatabaseInfo[];
    autoConnectTimeout: number;
}

export class AutoConnectService {
    private static readonly STORAGE_KEY = 'wechat-db-manager-autoconnect';
    private static readonly DEFAULT_TIMEOUT = 30000; // 30秒超时

    /**
     * 保存自动连接设置
     */
    static saveSettings(settings: AutoConnectSettings): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
            console.log('✅ 自动连接设置已保存');
        } catch (error) {
            console.error('❌ 保存自动连接设置失败:', error);
        }
    }

    /**
     * 加载自动连接设置
     */
    static loadSettings(): AutoConnectSettings {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const settings = JSON.parse(saved) as AutoConnectSettings;
                return {
                    enableAutoConnect: settings.enableAutoConnect ?? true,
                    lastConnectedDatabases: settings.lastConnectedDatabases ?? [],
                    autoConnectTimeout: settings.autoConnectTimeout ?? this.DEFAULT_TIMEOUT
                };
            }
        } catch (error) {
            console.error('❌ 加载自动连接设置失败:', error);
        }

        return {
            enableAutoConnect: true,
            lastConnectedDatabases: [],
            autoConnectTimeout: this.DEFAULT_TIMEOUT
        };
    }

    /**
     * 更新已连接数据库列表
     */
    static updateConnectedDatabases(databases: DatabaseInfo[]): void {
        const settings = this.loadSettings();
        settings.lastConnectedDatabases = databases;
        this.saveSettings(settings);
    }

    /**
     * 自动连接到之前连接的数据库
     */
    static async autoConnect(
        onProgress?: (message: string, current: number, total: number) => void,
        onError?: (error: string) => void
    ): Promise<DatabaseInfo[]> {
        const settings = this.loadSettings();

        if (!settings.enableAutoConnect) {
            console.log('🚫 自动连接已禁用');
            return [];
        }

        const databases = settings.lastConnectedDatabases;

        if (databases.length === 0) {
            console.log('ℹ️ 没有需要自动连接的数据库');
            return [];
        }

        console.log(`🚀 开始自动连接 ${databases.length} 个数据库`);

        const successfulConnections: DatabaseInfo[] = [];
        const failedConnections: string[] = [];

        for (let i = 0; i < databases.length; i++) {
            const database = databases[i];

            onProgress?.(
                `正在连接 ${database.filename}...`,
                i,
                databases.length
            );

            try {
                // 检查文件是否仍然存在和可访问
                if (!database.accessible) {
                    console.warn(`⚠️ 数据库 ${database.filename} 不可访问，跳过`);
                    failedConnections.push(`${database.filename}: 文件不可访问`);
                    continue;
                }

                // 尝试连接
                const connectPromise = dbManager.connectDatabase(database.id);
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('连接超时')), settings.autoConnectTimeout);
                });

                await Promise.race([connectPromise, timeoutPromise]);

                successfulConnections.push(database);
                console.log(`✅ 成功连接数据库: ${database.filename}`);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '未知错误';
                console.error(`❌ 连接数据库 ${database.filename} 失败:`, errorMessage);
                failedConnections.push(`${database.filename}: ${errorMessage}`);
            }
        }

        onProgress?.(
            `自动连接完成`,
            databases.length,
            databases.length
        );

        // 报告结果
        if (successfulConnections.length > 0) {
            console.log(`✅ 成功自动连接 ${successfulConnections.length}/${databases.length} 个数据库`);
        }

        if (failedConnections.length > 0) {
            const errorMessage = `部分数据库连接失败：\n${failedConnections.join('\n')}`;
            console.warn('⚠️ 自动连接部分失败:', errorMessage);
            onError?.(errorMessage);
        }

        return successfulConnections;
    }

    /**
     * 禁用自动连接
     */
    static disableAutoConnect(): void {
        const settings = this.loadSettings();
        settings.enableAutoConnect = false;
        this.saveSettings(settings);
    }

    /**
     * 启用自动连接
     */
    static enableAutoConnect(): void {
        const settings = this.loadSettings();
        settings.enableAutoConnect = true;
        this.saveSettings(settings);
    }

    /**
     * 清除自动连接设置
     */
    static clearSettings(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('✅ 自动连接设置已清除');
        } catch (error) {
            console.error('❌ 清除自动连接设置失败:', error);
        }
    }

    /**
     * 检查是否应该显示自动连接提示
     */
    static shouldShowAutoConnectPrompt(): boolean {
        const settings = this.loadSettings();
        return settings.enableAutoConnect && settings.lastConnectedDatabases.length > 0;
    }
}