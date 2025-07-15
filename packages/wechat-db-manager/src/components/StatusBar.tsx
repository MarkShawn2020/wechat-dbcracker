import {useAtom} from 'jotai';
import {databasesAtom, errorAtom, keysFilePathAtom, loadingAtom} from '../store/atoms';
import {AlertCircle, CheckCircle, File, Loader} from 'lucide-react';

export function StatusBar() {
    const [databases] = useAtom(databasesAtom);
    const [keysPath] = useAtom(keysFilePathAtom);
    const [loading] = useAtom(loadingAtom);
    const [error] = useAtom(errorAtom);

    const getStatusIcon = () => {
        if (loading) return <Loader className="h-4 w-4 animate-spin text-blue-600"/>;
        if (error) return <AlertCircle className="h-4 w-4 text-red-600"/>;
        if (databases.length > 0) return <CheckCircle className="h-4 w-4 text-green-600"/>;
        return <File className="h-4 w-4 text-gray-400"/>;
    };

    const getStatusText = () => {
        if (loading) return 'Loading...';
        if (error) return `Error: ${error}`;
        if (databases.length > 0) return `${databases.length} databases loaded`;
        if (keysPath) return 'No databases found';
        return 'No keys file selected';
    };

    const getStatusColor = () => {
        if (loading) return 'text-blue-600';
        if (error) return 'text-red-600';
        if (databases.length > 0) return 'text-green-600';
        return 'text-gray-500';
    };

    return (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
                {keysPath && (
                    <span className="text-xs text-gray-400 ml-2">
            • {keysPath.split('/').pop()}
          </span>
                )}
            </div>
        </div>
    );
}