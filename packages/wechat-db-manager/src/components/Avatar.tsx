import { useMemo } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showFallback?: boolean;
}

export function Avatar({ name, size = 'md', className = '', showFallback = true }: AvatarProps) {
    const { displayChar, backgroundColor, textColor } = useMemo(() => {
        // 生成显示字符
        const getDisplayChar = (name: string): string => {
            if (!name || name.trim() === '') return '?';
            
            const trimmedName = name.trim();
            
            // 中文名字：取最后一个字符（通常是名）
            if (/[\u4e00-\u9fa5]/.test(trimmedName)) {
                return trimmedName.charAt(trimmedName.length - 1);
            }
            
            // 英文名字：取首字母
            if (/[a-zA-Z]/.test(trimmedName)) {
                return trimmedName.charAt(0).toUpperCase();
            }
            
            // 数字或特殊字符：取第一个字符
            return trimmedName.charAt(0);
        };

        // 基于名字生成一致的颜色
        const getAvatarColors = (name: string): { backgroundColor: string; textColor: string } => {
            if (!name) return { backgroundColor: 'bg-gray-500', textColor: 'text-white' };
            
            // 预定义的颜色方案
            const colorSchemes = [
                { bg: 'bg-blue-500', text: 'text-white' },
                { bg: 'bg-green-500', text: 'text-white' },
                { bg: 'bg-purple-500', text: 'text-white' },
                { bg: 'bg-red-500', text: 'text-white' },
                { bg: 'bg-orange-500', text: 'text-white' },
                { bg: 'bg-teal-500', text: 'text-white' },
                { bg: 'bg-pink-500', text: 'text-white' },
                { bg: 'bg-indigo-500', text: 'text-white' },
                { bg: 'bg-cyan-500', text: 'text-white' },
                { bg: 'bg-emerald-500', text: 'text-white' },
                { bg: 'bg-amber-500', text: 'text-white' },
                { bg: 'bg-lime-500', text: 'text-white' },
                { bg: 'bg-rose-500', text: 'text-white' },
                { bg: 'bg-violet-500', text: 'text-white' },
                { bg: 'bg-fuchsia-500', text: 'text-white' },
            ];
            
            // 基于名字的hash生成一致的颜色索引
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                const char = name.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            const colorIndex = Math.abs(hash) % colorSchemes.length;
            return colorSchemes[colorIndex];
        };

        const displayChar = getDisplayChar(name);
        const colors = getAvatarColors(name);
        
        return {
            displayChar,
            backgroundColor: colors.bg,
            textColor: colors.text
        };
    }, [name]);

    const sizeClasses = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl'
    };

    return (
        <div className={`
            ${sizeClasses[size]} 
            ${backgroundColor} 
            ${textColor}
            rounded-full 
            flex 
            items-center 
            justify-center 
            font-semibold 
            select-none
            ${className}
        `}>
            {showFallback && (!name || name.trim() === '') ? (
                <User className="w-1/2 h-1/2 opacity-70" />
            ) : (
                displayChar
            )}
        </div>
    );
}

// 头像和名字组合组件
interface AvatarWithNameProps {
    name: string;
    subtitle?: string;
    avatarSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    layout?: 'horizontal' | 'vertical';
    className?: string;
    showSubtitle?: boolean;
}

export function AvatarWithName({ 
    name, 
    subtitle, 
    avatarSize = 'md', 
    layout = 'horizontal',
    className = '',
    showSubtitle = true
}: AvatarWithNameProps) {
    const layoutClasses = layout === 'horizontal' 
        ? 'flex items-center space-x-3' 
        : 'flex flex-col items-center space-y-2';
    
    const textAlignClass = layout === 'horizontal' ? 'text-left' : 'text-center';

    return (
        <div className={`${layoutClasses} ${className}`}>
            <Avatar name={name} size={avatarSize} />
            <div className={`flex-1 min-w-0 ${textAlignClass}`}>
                <h3 className="font-medium text-gray-900 truncate">
                    {name || '未知用户'}
                </h3>
                {showSubtitle && subtitle && (
                    <p className="text-xs text-gray-500 truncate">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

// 用于消息气泡的小头像组件
interface MessageAvatarProps {
    name: string;
    isOwn?: boolean;
    className?: string;
}

export function MessageAvatar({ name, isOwn = false, className = '' }: MessageAvatarProps) {
    return (
        <Avatar 
            name={name} 
            size="sm" 
            className={`flex-shrink-0 ${className} ${isOwn ? 'order-2' : 'order-1'}`}
        />
    );
}