import {QueryResult} from '../types';

export interface EnhancedContact {
    id: string;
    displayName: string;     // 优先显示的名字
    nickname?: string;       // 昵称
    remark?: string;         // 备注名
    username?: string;       // 用户名/微信号
    realName?: string;       // 真实姓名
    avatar?: string;         // 头像数据
    phoneNumber?: string;    // 电话号码
    email?: string;          // 邮箱
    contactType?: 'user' | 'group' | 'official' | 'unknown';
    lastActiveTime?: string; // 最后活跃时间
    isBlocked?: boolean;     // 是否被屏蔽
    isFriend?: boolean;      // 是否为好友
}

export class ContactParser {
    /**
     * 解析联系人数据，智能提取各种字段
     */
    static parseContacts(result: QueryResult): EnhancedContact[] {
        const {columns, rows} = result;

        // 智能字段映射
        const fieldMapping = this.createFieldMapping(columns);

        return rows
            .map((row, index) => this.parseContact(row, fieldMapping, index))
            .filter(contact => this.isValidContact(contact));
    }

    /**
     * 搜索联系人
     */
    static searchContacts(contacts: EnhancedContact[], searchTerm: string): EnhancedContact[] {
        if (!searchTerm.trim()) return contacts;

        const term = searchTerm.toLowerCase();

        return contacts.filter(contact =>
            contact.displayName.toLowerCase().includes(term) ||
            contact.nickname?.toLowerCase().includes(term) ||
            contact.remark?.toLowerCase().includes(term) ||
            contact.username?.toLowerCase().includes(term) ||
            contact.realName?.toLowerCase().includes(term)
        );
    }

    /**
     * 按类型过滤联系人
     */
    static filterByType(contacts: EnhancedContact[], type: EnhancedContact['contactType']): EnhancedContact[] {
        return contacts.filter(contact => contact.contactType === type);
    }

    /**
     * 获取联系人的最佳显示信息
     */
    static getDisplayInfo(contact: EnhancedContact): { name: string; subtitle: string } {
        const name = contact.displayName;

        // 构建副标题
        const subtitleParts: string[] = [];

        if (contact.remark && contact.remark !== contact.displayName) {
            subtitleParts.push(`备注: ${contact.remark}`);
        } else if (contact.nickname && contact.nickname !== contact.displayName) {
            subtitleParts.push(`昵称: ${contact.nickname}`);
        }

        if (contact.username && contact.username !== contact.displayName) {
            subtitleParts.push(`微信号: ${contact.username}`);
        }

        const subtitle = subtitleParts.length > 0
            ? subtitleParts.join(' • ')
            : contact.contactType === 'group'
                ? '群聊'
                : contact.contactType === 'official'
                    ? '公众号'
                    : '点击查看聊天记录';

        return {name, subtitle};
    }

    /**
     * 创建字段映射
     */
    private static createFieldMapping(columns: string[]) {
        const mapping: Record<string, number> = {};

        // 定义字段匹配规则
        const fieldRules = {
            // 名字相关字段（按优先级排序）
            remark: ['remark', 'remarkname', 'remark_name', 'contact_remark'],
            nickname: ['nickname', 'nick_name', 'displayname', 'display_name', 'name'],
            realname: ['realname', 'real_name', 'fullname', 'full_name'],

            // ID相关字段
            username: ['username', 'user_name', 'wxid', 'wx_id', 'userid', 'user_id'],
            contactid: ['contactid', 'contact_id', 'id', 'talker'],

            // 头像相关字段
            avatar: ['avatar', 'headimg', 'headimgurl', 'head_img_url', 'portrait', 'photo'],

            // 联系方式
            phone: ['phone', 'phonenumber', 'phone_number', 'mobile', 'tel'],
            email: ['email', 'mail', 'email_address'],

            // 状态字段
            type: ['type', 'contact_type', 'user_type', 'contacttype'],
            status: ['status', 'contact_status', 'friend_status'],
            blocked: ['blocked', 'is_blocked', 'blacklist'],

            // 时间字段
            lastactive: ['lastactive', 'last_active', 'lastseen', 'last_seen', 'updatetime', 'update_time']
        };

        // 为每个字段找到最匹配的列
        Object.entries(fieldRules).forEach(([field, patterns]) => {
            for (const pattern of patterns) {
                const index = columns.findIndex(col =>
                    col.toLowerCase().includes(pattern.toLowerCase())
                );
                if (index !== -1) {
                    mapping[field] = index;
                    break;
                }
            }
        });

        return mapping;
    }

    /**
     * 解析单个联系人
     */
    private static parseContact(row: any[], mapping: Record<string, number>, index: number): EnhancedContact {
        const getValue = (field: string): string | undefined => {
            const colIndex = mapping[field];
            if (colIndex === undefined || colIndex === -1) return undefined;
            const value = row[colIndex];
            return value && String(value).trim() !== '' && String(value) !== 'null'
                ? String(value).trim()
                : undefined;
        };

        // 提取各种名字字段
        const remark = getValue('remark');
        const nickname = getValue('nickname');
        const realname = getValue('realname');
        const username = getValue('username');

        // 确定显示名字的优先级：备注名 > 昵称 > 真实姓名 > 用户名
        const displayName = remark || nickname || realname || username || `联系人${index + 1}`;

        // 生成唯一ID
        const contactId = getValue('contactid') || getValue('username') || displayName || `contact_${index}`;

        // 判断联系人类型
        const contactType = this.determineContactType(displayName, username);

        return {
            id: contactId,
            displayName,
            nickname,
            remark,
            username,
            realName: realname,
            avatar: getValue('avatar'),
            phoneNumber: getValue('phone'),
            email: getValue('email'),
            contactType,
            lastActiveTime: getValue('lastactive'),
            isBlocked: this.parseBoolean(getValue('blocked')),
            isFriend: contactType === 'user'
        };
    }

    /**
     * 判断联系人类型
     */
    private static determineContactType(displayName?: string, username?: string): EnhancedContact['contactType'] {
        if (!displayName && !username) return 'unknown';

        const name = displayName || username || '';

        // 群聊识别
        if (name.includes('@chatroom') || name.startsWith('群聊') || name.includes('群')) {
            return 'group';
        }

        // 公众号识别
        if (name.startsWith('gh_') || name.includes('公众号') || name.includes('服务号')) {
            return 'official';
        }

        // 系统账号识别
        if (name.includes('微信') || name.includes('系统') || name.startsWith('wx')) {
            return 'official';
        }

        return 'user';
    }

    /**
     * 解析布尔值
     */
    private static parseBoolean(value?: string): boolean {
        if (!value) return false;
        return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
    }

    /**
     * 验证联系人是否有效
     */
    private static isValidContact(contact: EnhancedContact): boolean {
        return !!(
            contact.id &&
            contact.displayName &&
            contact.displayName.trim() !== '' &&
            !contact.displayName.includes('null')
        );
    }
}