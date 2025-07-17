import {AlertCircle, CheckCircle, Loader2, RefreshCw, X} from 'lucide-react';

interface AutoConnectIndicatorProps {
    isConnecting: boolean;
    progress?: {
        message: string;
        current: number;
        total: number;
    } | null;
    error?: string | null;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export function AutoConnectIndicator({
                                         isConnecting,
                                         progress,
                                         error,
                                         onRetry,
                                         onDismiss
                                     }: AutoConnectIndicatorProps) {
    if (!isConnecting && !error) return null;

    return (
        <div className={`w-full px-4 py-3 border-b ${
            error ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        }`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {/* 状态图标 */}
                    {isConnecting ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600"/>
                    ) : error ? (
                        <AlertCircle className="h-5 w-5 text-red-600"/>
                    ) : (
                        <CheckCircle className="h-5 w-5 text-green-600"/>
                    )}

                    {/* 状态信息 */}
                    <div className="flex-1 min-w-0">
                        {isConnecting && progress ? (
                            <div>
                                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-blue-900">
                    {progress.message}
                  </span>
                                    <span className="text-xs text-blue-600">
                    ({progress.current}/{progress.total})
                  </span>
                                </div>

                                {/* 进度条 */}
                                <div className="mt-1 w-full bg-blue-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ) : isConnecting ? (
                            <span className="text-sm font-medium text-blue-900">
                正在自动连接数据库...
              </span>
                        ) : error ? (
                            <div>
                                <div className="text-sm font-medium text-red-900 mb-1">
                                    自动连接失败
                                </div>
                                <div className="text-xs text-red-700 whitespace-pre-wrap">
                                    {error}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center space-x-2">
                    {error && onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center space-x-1 px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                            <RefreshCw className="h-3 w-3"/>
                            <span>重试</span>
                        </button>
                    )}

                    {(error || !isConnecting) && onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-4 w-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}