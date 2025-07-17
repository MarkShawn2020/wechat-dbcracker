/**
 * 可取消的操作类
 */
export class CancellableOperation {
    private cancelled = false;
    private timeoutId?: NodeJS.Timeout;

    constructor(private timeoutMs: number = 10000) {
    } // 默认10秒超时

    cancel() {
        this.cancelled = true;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    isCancelled() {
        return this.cancelled;
    }

    withTimeout<T>(promise: Promise<T>): Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                this.timeoutId = setTimeout(() => {
                    if (!this.cancelled) {
                        reject(new Error('Operation timed out'));
                    }
                }, this.timeoutMs);
            })
        ]);
    }
}

/**
 * 性能优化工具类
 * 处理大数据集的查询和处理
 */
export class PerformanceOptimizer {
    private static readonly BATCH_SIZE = 100; // 每批处理的记录数
    private static readonly MAX_SAMPLE_SIZE = 1000; // 最大采样数量
    private static readonly QUERY_TIMEOUT = 10000; // 查询超时时间(毫秒)

    /**
     * 高效的表采样查询
     * 使用时间范围和LIMIT来避免全表扫描
     */
    static async efficientTableSample(
        dbManager: any,
        dbId: string,
        tableName: string,
        operation: CancellableOperation,
        sampleSize: number = PerformanceOptimizer.MAX_SAMPLE_SIZE
    ): Promise<any[]> {
        if (operation.isCancelled()) {
            throw new Error('Operation was cancelled');
        }

        console.log(`⚡ 开始高效采样表 ${tableName}，目标样本数: ${sampleSize}`);

        // 策略1：尝试按时间范围查询最新数据
        const timeBasedQueries = [
            // 最近一周的数据
            `SELECT * FROM ${tableName} WHERE timestamp > ${Date.now() - 7 * 24 * 60 * 60 * 1000} ORDER BY timestamp DESC LIMIT ${sampleSize}`,
            // 最近一个月的数据
            `SELECT * FROM ${tableName} WHERE timestamp > ${Date.now() - 30 * 24 * 60 * 60 * 1000} ORDER BY timestamp DESC LIMIT ${sampleSize}`,
            // 如果没有timestamp字段，尝试createtime
            `SELECT * FROM ${tableName} WHERE createtime > ${Date.now() - 7 * 24 * 60 * 60 * 1000} ORDER BY createtime DESC LIMIT ${sampleSize}`,
        ];

        // 策略2：如果时间查询失败，使用ROWID或其他方法
        const fallbackQueries = [
            `SELECT * FROM ${tableName} ORDER BY ROWID DESC LIMIT ${sampleSize}`,
            `SELECT * FROM ${tableName} LIMIT ${sampleSize}`,
        ];

        const allQueries = [...timeBasedQueries, ...fallbackQueries];

        for (const query of allQueries) {
            if (operation.isCancelled()) {
                throw new Error('Operation was cancelled');
            }

            try {
                console.log(`🔍 尝试查询: ${query.substring(0, 100)}...`);
                const result = await operation.withTimeout(
                    dbManager.executeQuery(dbId, query)
                );

                if (result.rows.length > 0) {
                    console.log(`✅ 查询成功，获得 ${result.rows.length} 条记录`);
                    return result.rows;
                }
            } catch (error) {
                console.warn(`❌ 查询失败: ${error.message}`);

            }
        }

        console.warn(`⚠️ 所有查询策略都失败了，表 ${tableName} 可能为空或不可访问`);
        return [];
    }

    /**
     * 分批处理大数据集
     */
    static async processBatches<T, R>(
        items: T[],
        batchProcessor: (batch: T[], batchIndex: number) => Promise<R[]>,
        operation: CancellableOperation,
        onProgress?: (processed: number, total: number) => void
    ): Promise<R[]> {
        const results: R[] = [];
        const batchSize = this.BATCH_SIZE;
        const totalBatches = Math.ceil(items.length / batchSize);

        for (let i = 0; i < totalBatches; i++) {
            if (operation.isCancelled()) {
                throw new Error('Operation was cancelled');
            }

            const batchStart = i * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, items.length);
            const batch = items.slice(batchStart, batchEnd);

            try {
                const batchResults = await batchProcessor(batch, i);
                results.push(...batchResults);

                if (onProgress) {
                    onProgress(batchEnd, items.length);
                }
            } catch (error) {
                console.warn(`❌ 批次 ${i + 1}/${totalBatches} 处理失败:`, error);

            }
        }

        return results;
    }

    /**
     * 内存友好的联系人活跃度检测
     */
    static async memoryFriendlyActivityDetection(
        dbManager: any,
        messageDbs: any[],
        operation: CancellableOperation,
        onProgress?: (current: number, total: number, message: string) => void
    ): Promise<Map<string, string>> {
        const activityMap = new Map<string, string>();
        let processedDbs = 0;

        for (const messageDb of messageDbs) {
            if (operation.isCancelled()) {
                throw new Error('Operation was cancelled');
            }

            if (onProgress) {
                onProgress(processedDbs, messageDbs.length, `处理数据库 ${messageDb.filename}`);
            }

            try {
                await dbManager.connectDatabase(messageDb.id);
                const tables = await dbManager.getTables(messageDb.id);

                // 只查找最有可能的聊天表，避免处理太多表
                const chatTables = tables.filter(table => {
                    const name = table.name.toLowerCase();
                    return name.startsWith('chat_') || name === 'chat';
                }).slice(0, 3); // 最多只处理前3个表

                for (const chatTable of chatTables) {
                    if (operation.isCancelled()) {
                        throw new Error('Operation was cancelled');
                    }

                    try {
                        const rows = await this.efficientTableSample(
                            dbManager,
                            messageDb.id,
                            chatTable.name,
                            operation,
                            200 // 每个表最多采样200条记录
                        );

                        rows.forEach(row => {
                            // 提取联系人标识符 - 只检查前几个字段
                            const possibleContactIds = [row[0], row[1], row[2]].filter(field =>
                                field && typeof field === 'string' && field.includes('@')
                            );

                            // 提取时间戳 - 只检查可能的时间字段
                            const timestamp = [row[3], row[4], row[5]].find(field =>
                                field && (typeof field === 'number' || /^\d{10,13}$/.test(String(field)))
                            );

                            if (timestamp) {
                                const timestampStr = String(timestamp);
                                possibleContactIds.forEach(contactId => {
                                    const currentTime = activityMap.get(contactId);
                                    if (!currentTime || timestampStr > currentTime) {
                                        activityMap.set(contactId, timestampStr);
                                    }
                                });
                            }
                        });

                    } catch (error) {
                        console.warn(`❌ 处理表 ${chatTable.name} 失败:`, error);
                    }
                }

            } catch (error) {
                console.warn(`❌ 处理数据库 ${messageDb.filename} 失败:`, error);
            }

            processedDbs++;
        }

        return activityMap;
    }

    /**
     * 延迟执行，避免阻塞UI
     */
    static async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 分时执行，避免长时间阻塞
     */
    static async timeSlicedExecution<T>(
        tasks: (() => Promise<T>)[],
        timeSliceMs: number = 50
    ): Promise<T[]> {
        const results: T[] = [];
        let startTime = Date.now();

        for (const task of tasks) {
            const result = await task();
            results.push(result);

            // 如果执行时间超过时间片，让出控制权
            if (Date.now() - startTime > timeSliceMs) {
                await this.delay(0); // 让出控制权给浏览器
                startTime = Date.now();
            }
        }

        return results;
    }
}