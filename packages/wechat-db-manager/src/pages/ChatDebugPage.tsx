import React, { useState } from 'react';
import { dbManager } from '../api';
import { WeChatTableMatcher } from '../utils/wechatTableMatcher';
import { EnhancedContact } from '../utils/contactParser';
import { ChatDataService } from '../services/chatDataService';
import { useAtom } from 'jotai';
import { databasesAtom } from '../store/atoms';
import { DatabaseInfo, TableInfo } from '../types';

interface MappingDiagnostic {
    contact: EnhancedContact;
    identifiers: string[];
    candidates: string[];
    matches: TableInfo[];
}

export function ChatDebugPage() {
    const [databases] = useAtom(databasesAtom);
    const [diagnostics, setDiagnostics] = useState<MappingDiagnostic[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedContactDb, setSelectedContactDb] = useState<DatabaseInfo | null>(null);
    const [selectedMessageDbs, setSelectedMessageDbs] = useState<DatabaseInfo[]>([]);

    // 获取联系人数据库
    const contactDbs = databases.filter(db => 
        db.filename.toLowerCase().includes('contact') || 
        db.filename.toLowerCase().includes('wccontact')
    );

    // 获取消息数据库
    const messageDbs = databases.filter(db => 
        db.filename.toLowerCase().includes('msg') || 
        db.filename.toLowerCase().includes('message')
    );

    const runDiagnostics = async () => {
        if (!selectedContactDb || selectedMessageDbs.length === 0) {
            alert('请选择联系人数据库和至少一个消息数据库');
            return;
        }

        setIsLoading(true);
        try {
            // 加载联系人
            const contacts = await ChatDataService.loadContacts(selectedContactDb);
            console.log(`加载了 ${contacts.length} 个联系人`);

            const diagnosticResults: MappingDiagnostic[] = [];

            // 为每个消息数据库运行诊断
            for (const messageDb of selectedMessageDbs) {
                console.log(`诊断数据库: ${messageDb.filename}`);
                
                const tables = await dbManager.getTables(messageDb.id);
                const chatTables = WeChatTableMatcher.findChatTables(tables);
                
                console.log(`数据库 ${messageDb.filename} 中找到 ${chatTables.length} 个聊天表`);

                // 对每个联系人进行映射诊断（限制前20个以避免过多输出）
                const contactsToTest = contacts.slice(0, 20);
                
                for (const contact of contactsToTest) {
                    const diagnostic = WeChatTableMatcher.diagnoseChatMapping(contact, chatTables);
                    diagnosticResults.push(diagnostic);
                }
            }

            setDiagnostics(diagnosticResults);
            
        } catch (error) {
            console.error('诊断失败:', error);
            alert(`诊断失败: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <h1 className="text-xl font-semibold mb-4">微信联系人-聊天表映射诊断工具</h1>
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                    <p className="text-blue-800 text-sm">
                        此工具用于诊断M_NSUSRNAME到Chat_xxx表的MD5映射关系，帮助解决联系人与聊天记录无法正确匹配的问题。
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-sm font-medium mb-2">选择联系人数据库</h3>
                        <div className="space-y-2">
                            {contactDbs.map(db => (
                                <div key={db.id} className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id={`contact-${db.id}`}
                                        name="contactDb"
                                        checked={selectedContactDb?.id === db.id}
                                        onChange={() => setSelectedContactDb(db)}
                                    />
                                    <label htmlFor={`contact-${db.id}`} className="text-sm">
                                        {db.filename}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium mb-2">选择消息数据库</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {messageDbs.map(db => (
                                <div key={db.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`message-${db.id}`}
                                        checked={selectedMessageDbs.some(selected => selected.id === db.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedMessageDbs([...selectedMessageDbs, db]);
                                            } else {
                                                setSelectedMessageDbs(selectedMessageDbs.filter(selected => selected.id !== db.id));
                                            }
                                        }}
                                    />
                                    <label htmlFor={`message-${db.id}`} className="text-sm">
                                        {db.filename}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={runDiagnostics} 
                    disabled={isLoading || !selectedContactDb || selectedMessageDbs.length === 0}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 mt-4"
                >
                    {isLoading ? '运行诊断中...' : '开始诊断映射关系'}
                </button>
            </div>

            {diagnostics.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">诊断结果 ({diagnostics.length} 个联系人)</h2>
                    <div className="space-y-4">
                        {diagnostics.map((diagnostic, index) => (
                            <details key={index} className="mb-4">
                                <summary className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                    <div className="flex items-center space-x-3">
                                        <span className="font-medium">{diagnostic.contact.displayName}</span>
                                        <span className={`px-2 py-1 text-xs rounded ${
                                            diagnostic.matches.length > 0 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {diagnostic.matches.length > 0 ? `${diagnostic.matches.length} 个匹配` : '无匹配'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {diagnostic.candidates.length} 个候选表名
                                    </span>
                                </summary>
                                <div className="p-3 border-l-2 border-gray-200 ml-3 mt-2">
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <h4 className="font-medium text-gray-700">联系人信息</h4>
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                <div>显示名: {diagnostic.contact.displayName}</div>
                                                <div>用户名: {diagnostic.contact.username || 'N/A'}</div>
                                                <div>ID: {diagnostic.contact.id}</div>
                                                <div>原始ID: {diagnostic.contact.originalId || 'N/A'}</div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-gray-700">提取的标识符</h4>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {diagnostic.identifiers.map((id, i) => (
                                                    <span key={i} className="px-2 py-1 text-xs bg-gray-100 border rounded">
                                                        {id}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {diagnostic.matches.length > 0 && (
                                            <div>
                                                <h4 className="font-medium text-green-700">匹配的聊天表</h4>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {diagnostic.matches.map((table, i) => (
                                                        <span key={i} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                                            {table.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="font-medium text-gray-700">
                                                生成的候选表名 (显示前10个，共{diagnostic.candidates.length}个)
                                            </h4>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {diagnostic.candidates.slice(0, 10).map((candidate, i) => (
                                                    <span key={i} className="px-2 py-1 text-xs bg-gray-100 border rounded">
                                                        {candidate}
                                                    </span>
                                                ))}
                                                {diagnostic.candidates.length > 10 && (
                                                    <span className="px-2 py-1 text-xs bg-gray-100 border rounded">
                                                        +{diagnostic.candidates.length - 10} 更多...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}