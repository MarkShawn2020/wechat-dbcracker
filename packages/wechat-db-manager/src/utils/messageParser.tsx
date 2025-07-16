import { QueryResult } from '../types';
import { EnhancedContact } from './contactParser';

export interface EnhancedMessage {
    id: string;
    content: string;
    timestamp: string;
    senderId: string;
    senderName: string;
    senderDisplayName: string;
    receiverId?: string;
    isOwn: boolean;
    messageType: 'text' | 'image' | 'voice' | 'video' | 'file' | 'system' | 'unknown';
    messageSubType?: string;
    originalType?: string;
    attachment?: {
        filename?: string;
        size?: number;
        url?: string;
    };
    isDeleted?: boolean;
    editTime?: string;
}

export class MessageParser {
    /**
     * 解析消息数据
     */
    static parseMessages(
        result: QueryResult, 
        targetContact: EnhancedContact, 
        allContacts: EnhancedContact[],
        dbId: string, 
        startIndex: number,
        currentUserId?: string
    ): EnhancedMessage[] {
        const { columns, rows } = result;
        
        // 创建字段映射
        const fieldMapping = this.createFieldMapping(columns);
        
        // 创建联系人查找映射
        const contactLookup = this.createContactLookup(allContacts);
        
        return rows
            .map((row, index) => 
                this.parseMessage(row, fieldMapping, targetContact, contactLookup, dbId, startIndex + index, currentUserId)
            )
            .filter(message => this.isMessageForContact(message, targetContact))
            .filter(message => message.content.trim() !== '');
    }

    /**
     * 创建字段映射
     */
    private static createFieldMapping(columns: string[]) {
        const mapping: Record<string, number> = {};
        
        const fieldRules = {
            // 消息内容
            content: ['content', 'message', 'text', 'msg', 'body'],
            
            // 发送者信息
            sender: ['sender', 'from', 'talker', 'fromuser', 'from_user'],
            receiver: ['receiver', 'to', 'touser', 'to_user'],
            
            // 时间戳
            timestamp: ['timestamp', 'time', 'createtime', 'create_time', 'msgtime', 'msg_time'],
            
            // 消息类型
            type: ['type', 'msgtype', 'msg_type', 'messagetype', 'message_type'],
            subtype: ['subtype', 'msg_subtype', 'sub_type'],
            
            // 消息状态
            status: ['status', 'msg_status', 'message_status'],
            deleted: ['deleted', 'is_deleted', 'del_flag'],
            
            // 附件信息
            filename: ['filename', 'file_name', 'attachment_name'],
            filesize: ['filesize', 'file_size', 'attachment_size'],
            filepath: ['filepath', 'file_path', 'attachment_path'],
            
            // 其他
            msgid: ['msgid', 'msg_id', 'message_id', 'id'],
            edittime: ['edittime', 'edit_time', 'updatetime', 'update_time']
        };

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
     * 创建联系人查找映射
     */
    private static createContactLookup(contacts: EnhancedContact[]): Map<string, EnhancedContact> {
        const lookup = new Map<string, EnhancedContact>();
        
        contacts.forEach(contact => {
            // 使用多个标识符作为查找键
            const identifiers = [
                contact.id,
                contact.username,
                contact.displayName,
                contact.nickname,
                contact.remark
            ].filter(Boolean);
            
            identifiers.forEach(id => {
                if (id) lookup.set(id, contact);
            });
        });
        
        return lookup;
    }

    /**
     * 解析单条消息
     */
    private static parseMessage(
        row: any[], 
        mapping: Record<string, number>, 
        targetContact: EnhancedContact,
        contactLookup: Map<string, EnhancedContact>,
        dbId: string, 
        index: number,
        currentUserId?: string
    ): EnhancedMessage {
        const getValue = (field: string): string | undefined => {
            const colIndex = mapping[field];
            if (colIndex === undefined || colIndex === -1) return undefined;
            const value = row[colIndex];
            return value !== null && value !== undefined ? String(value) : undefined;
        };

        const senderId = getValue('sender') || '';
        const receiverId = getValue('receiver') || '';
        const content = getValue('content') || '';
        const rawType = getValue('type') || '';
        const subType = getValue('subtype') || '';
        
        // 确定发送者信息
        const senderInfo = this.determineSenderInfo(senderId, targetContact, contactLookup, currentUserId);
        
        // 解析消息类型
        const messageType = this.parseMessageType(rawType, content);
        
        // 解析时间戳
        const timestamp = this.parseTimestamp(getValue('timestamp'));
        
        // 解析附件信息
        const attachment = this.parseAttachment(getValue('filename'), getValue('filesize'), getValue('filepath'));

        return {
            id: `${dbId}_msg_${index}`,
            content,
            timestamp,
            senderId,
            senderName: senderInfo.name,
            senderDisplayName: senderInfo.displayName,
            receiverId,
            isOwn: senderInfo.isOwn,
            messageType,
            messageSubType: subType,
            originalType: rawType,
            attachment,
            isDeleted: this.parseBoolean(getValue('deleted')),
            editTime: getValue('edittime')
        };
    }

    /**
     * 确定发送者信息
     */
    private static determineSenderInfo(
        senderId: string, 
        targetContact: EnhancedContact,
        contactLookup: Map<string, EnhancedContact>,
        currentUserId?: string
    ): { name: string; displayName: string; isOwn: boolean } {
        // 检查是否是当前用户发送的
        const isOwn = currentUserId ? senderId === currentUserId : false;
        
        if (isOwn) {
            return {
                name: '我',
                displayName: '我',
                isOwn: true
            };
        }
        
        // 查找发送者联系人信息
        const senderContact = contactLookup.get(senderId);
        
        if (senderContact) {
            return {
                name: senderContact.displayName,
                displayName: senderContact.displayName,
                isOwn: false
            };
        }
        
        // 如果是目标联系人
        if (senderId === targetContact.id || senderId === targetContact.username) {
            return {
                name: targetContact.displayName,
                displayName: targetContact.displayName,
                isOwn: false
            };
        }
        
        // 无法识别的发送者
        return {
            name: senderId || '未知用户',
            displayName: senderId || '未知用户',
            isOwn: false
        };
    }

    /**
     * 解析消息类型
     */
    private static parseMessageType(rawType: string, content: string): EnhancedMessage['messageType'] {
        if (!rawType) {
            // 基于内容推断类型
            if (content.includes('[图片]') || content.includes('[Image]')) return 'image';
            if (content.includes('[语音]') || content.includes('[Voice]')) return 'voice';
            if (content.includes('[视频]') || content.includes('[Video]')) return 'video';
            if (content.includes('[文件]') || content.includes('[File]')) return 'file';
            return 'text';
        }
        
        const type = rawType.toLowerCase();
        
        // 常见的微信消息类型映射
        if (type.includes('1') || type === 'text') return 'text';
        if (type.includes('3') || type === 'image' || type.includes('img')) return 'image';
        if (type.includes('34') || type === 'voice' || type.includes('audio')) return 'voice';
        if (type.includes('43') || type === 'video') return 'video';
        if (type.includes('49') || type === 'file' || type.includes('attach')) return 'file';
        if (type.includes('10000') || type === 'system') return 'system';
        
        return 'unknown';
    }

    /**
     * 解析时间戳
     */
    private static parseTimestamp(timestamp?: string): string {
        if (!timestamp) return new Date().toISOString();
        
        const num = parseFloat(timestamp);
        if (isNaN(num)) return new Date().toISOString();
        
        // 根据数值大小判断是秒还是毫秒
        const date = new Date(num > 1000000000000 ? num : num * 1000);
        return date.toISOString();
    }

    /**
     * 解析附件信息
     */
    private static parseAttachment(filename?: string, filesize?: string, filepath?: string) {
        if (!filename && !filepath) return undefined;
        
        return {
            filename,
            size: filesize ? parseInt(filesize) : undefined,
            url: filepath
        };
    }

    /**
     * 解析布尔值
     */
    private static parseBoolean(value?: string): boolean {
        if (!value) return false;
        return value.toLowerCase() === 'true' || value === '1' || value === 'yes';
    }

    /**
     * 检查消息是否属于目标联系人
     */
    private static isMessageForContact(message: EnhancedMessage, targetContact: EnhancedContact): boolean {
        const { senderId, receiverId } = message;
        const { id, username, displayName } = targetContact;
        
        // 检查发送者或接收者是否匹配目标联系人
        const identifiers = [id, username, displayName].filter(Boolean);
        
        return identifiers.some(identifier => 
            senderId.includes(identifier) || 
            receiverId?.includes(identifier) ||
            senderId === identifier ||
            receiverId === identifier
        );
    }

    /**
     * 格式化消息显示内容
     */
    static formatMessageContent(message: EnhancedMessage): string {
        const { content, messageType, attachment } = message;
        
        switch (messageType) {
            case 'image':
                return '[图片]';
            case 'voice':
                return '[语音]';
            case 'video':
                return '[视频]';
            case 'file':
                return attachment?.filename ? `[文件: ${attachment.filename}]` : '[文件]';
            case 'system':
                return content || '[系统消息]';
            default:
                return content || '[未知消息]';
        }
    }

    /**
     * 获取消息类型显示标签
     */
    static getMessageTypeLabel(messageType: EnhancedMessage['messageType']): string {
        const labels = {
            text: '文本',
            image: '图片',
            voice: '语音',
            video: '视频',
            file: '文件',
            system: '系统',
            unknown: '未知'
        };
        
        return labels[messageType] || '未知';
    }
}