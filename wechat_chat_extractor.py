#!/usr/bin/env python3
"""
WeChat Chat Extractor

给定key path，遍历所有数据库里的chat表，输出json文件

用法:
    python wechat_chat_extractor.py /path/to/.keys

需要安装的依赖:
    pip install pysqlcipher3
"""

import argparse
import csv
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

try:
    from pysqlcipher3 import dbapi2 as sqlite
except ImportError as e:
    print(f"缺少必要依赖: {e}")
    print("请安装依赖: pip install pysqlcipher3")
    sys.exit(1)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class WeChatChatExtractor:
    """WeChat聊天记录提取器"""
    
    def __init__(self, keys_file_path: str):
        """
        初始化提取器
        
        Args:
            keys_file_path: .keys文件路径
        """
        self.keys_file_path = Path(keys_file_path)
        self.databases: List[Dict[str, Any]] = []
        self.chat_data: List[Dict[str, Any]] = []
        
    def extract_db_type(self, filepath: str) -> str:
        """从文件路径提取数据库类型"""
        parts = filepath.split('/')
        for i in range(len(parts) - 2, -1, -1):
            if parts[i] != '':
                return parts[i]
        return 'unknown'
        
    def parse_keys(self, content: str) -> List[Dict[str, Any]]:
        """解析.keys文件内容"""
        keys = []
        lines = content.split('\n')
        
        current_path = ''
        current_key = ''
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # 匹配路径行
            path_match = re.match(r"sqlcipher db path: '([^']+)'", line)
            if path_match:
                current_path = path_match.group(1)
                continue
            
            # 匹配密钥行
            key_match = re.match(r'PRAGMA key = "([^"]+)"', line)
            if key_match and current_path:
                current_key = key_match.group(1)
                
                keys.append({
                    'path': current_path,
                    'key': current_key,
                    'cipher_compatibility': 3,  # 默认兼容性版本
                    'type': self.extract_db_type(current_path)
                })
                
                current_path = ''
                current_key = ''
        
        return keys
        
    def load_keys(self) -> None:
        """加载.keys文件并解析数据库信息"""
        try:
            with open(self.keys_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            logger.info(f"加载keys文件: {self.keys_file_path}")
            
            # 解析keys文件
            parsed_keys = self.parse_keys(content)
            
            for key_info in parsed_keys:
                db_path = key_info['path']
                
                # 检查数据库文件是否存在
                if os.path.exists(db_path):
                    db_size = os.path.getsize(db_path)
                    self.databases.append({
                        'type': key_info['type'],
                        'path': db_path,
                        'key': key_info['key'],
                        'cipher_compatibility': key_info['cipher_compatibility']
                    })
                    logger.info(f"📁 找到数据库: {key_info['type']} - {Path(db_path).name} ({db_size:,} bytes)")
                    logger.info(f"   路径: {db_path}")
                    logger.info(f"   密钥: {key_info['key']}")
                    logger.info(f"   cipher_compatibility: {key_info['cipher_compatibility']}")
                else:
                    logger.warning(f"❌ 数据库文件不存在: {db_path}")
            
            logger.info(f"总共加载了 {len(self.databases)} 个有效数据库")
            
        except Exception as e:
            logger.error(f"加载keys文件失败: {e}")
            raise
    
    def connect_database(self, db_info: Dict[str, Any]) -> Optional[sqlite.Connection]:
        """
        连接SQLCipher数据库
        
        Args:
            db_info: 数据库信息字典
            
        Returns:
            数据库连接对象或None
        """
        db_name = Path(db_info['path']).name
        logger.debug(f"🔐 尝试连接数据库: {db_name}")
        logger.debug(f"   路径: {db_info['path']}")
        logger.debug(f"   密钥: {db_info['key']}")
        logger.debug(f"   cipher_compatibility: {db_info['cipher_compatibility']}")
        
        # 尝试不同的连接方式
        key_formats = []
        original_key = db_info['key']
        
        if original_key.startswith("x'") and original_key.endswith("'"):
            hex_key = original_key[2:-1]
            key_formats = [
                f"x'{hex_key}'",           # 标准十六进制格式
                original_key,             # 原始格式
                f'"{original_key}"',      # 带引号的原始格式
                hex_key                   # 纯十六进制
            ]
        else:
            key_formats = [
                original_key,
                f'"{original_key}"',
                f"x'{original_key}'"
            ]
        
        for i, key_format in enumerate(key_formats):
            try:
                logger.debug(f"   尝试方式{i+1}: PRAGMA key = {key_format}")
                
                conn = sqlite.connect(db_info['path'])
                cursor = conn.cursor()
                
                # 设置密钥
                cursor.execute(f"PRAGMA key = {key_format}")
                
                # 设置兼容性
                cursor.execute(f"PRAGMA cipher_compatibility = {db_info['cipher_compatibility']}")
                
                # 测试连接
                logger.debug(f"   测试连接: 查询 sqlite_master 表...")
                cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table'")
                table_count = cursor.fetchone()[0]
                
                logger.info(f"✅ 成功连接数据库 {db_name}，包含 {table_count} 个表 (使用方式{i+1})")
                return conn
                
            except Exception as e:
                logger.debug(f"   方式{i+1}失败: {str(e)}")
                if conn:
                    conn.close()
                continue
        
        # 所有方式都失败
        logger.warning(f"❌ 数据库解密失败 {db_name}: 尝试了 {len(key_formats)} 种密钥格式都失败")
        return None
    
    def get_table_names(self, conn: sqlite.Connection) -> List[str]:
        """获取数据库中所有表名"""
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            return tables
        except Exception as e:
            logger.error(f"获取表名失败: {e}")
            return []
    
    def find_chat_tables(self, tables: List[str]) -> List[str]:
        """
        查找聊天记录表
        
        Args:
            tables: 表名列表
            
        Returns:
            聊天表名列表
        """
        chat_tables = []
        
        for table in tables:
            name_lower = table.lower()
            
            # 匹配聊天表模式
            if (name_lower.startswith('chat_') or
                name_lower == 'chat' or
                re.match(r'^chat\d+$', name_lower) or
                name_lower.startswith('chatroom_') or
                name_lower.startswith('message_') or
                ('chat' in name_lower and 'room' in name_lower)):
                chat_tables.append(table)
        
        # 按优先级排序，Chat_开头的优先
        chat_tables.sort(key=lambda x: (not x.lower().startswith('chat_'), x.lower()))
        
        logger.info(f"找到 {len(chat_tables)} 个聊天表: {chat_tables}")
        return chat_tables
    
    def validate_chat_table(self, conn: sqlite.Connection, table_name: str) -> Tuple[bool, List[str]]:
        """
        验证表是否是有效的聊天记录表
        
        Args:
            conn: 数据库连接
            table_name: 表名
            
        Returns:
            (是否有效, 字段列表)
        """
        try:
            cursor = conn.cursor()
            
            # 获取表结构
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns_info = cursor.fetchall()
            columns = [col[1].lower() for col in columns_info]  # col[1] 是列名
            
            # 检查是否有数据
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            
            if row_count == 0:
                logger.debug(f"表 {table_name} 无数据")
                return False, columns
            
            # 检查关键字段
            # 微信的实际字段结构: meslocalid, messvrid, msgcreatetime, msgcontent, msgstatus, messagetype 等
            has_msg_id = any(col in columns for col in ['meslocalid', 'messvrid', 'localid'])
            has_time = any('time' in col for col in columns)
            has_content = any(keyword in col for col in columns for keyword in ['content', 'message', 'msg'])
            
            # 更宽松的验证条件：只要有消息ID或时间或内容字段就认为是有效的聊天表
            is_valid = has_msg_id or has_time or has_content
            
            if is_valid:
                logger.info(f"✓ 表 {table_name} 验证通过，包含 {row_count} 条记录")
            else:
                logger.debug(f"✗ 表 {table_name} 验证失败，缺少必要字段")
                logger.debug(f"  消息ID字段: {has_msg_id}, 时间字段: {has_time}, 内容字段: {has_content}")
                logger.debug(f"  所有字段: {columns}")
            
            return is_valid, columns
            
        except Exception as e:
            logger.error(f"验证表 {table_name} 失败: {e}")
            return False, []
    
    def extract_chat_data(self, conn: sqlite.Connection, table_name: str, columns: List[str], 
                         db_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        从聊天表中提取数据
        
        Args:
            conn: 数据库连接
            table_name: 表名
            columns: 字段列表
            db_info: 数据库信息
            
        Returns:
            聊天记录列表
        """
        messages = []
        
        try:
            cursor = conn.cursor()
            
            # 识别关键字段
            # 微信的实际字段结构
            sender_col = self._find_column(columns, ['meslocalid', 'messvrid', 'localid'])  # 使用消息ID作为标识
            time_col = self._find_column(columns, ['msgcreatetime', 'createtime', 'timestamp', 'time'])
            content_col = self._find_column(columns, ['msgcontent', 'content', 'message', 'msg'])
            msgid_col = self._find_column(columns, ['meslocalid', 'messvrid', 'msgid', 'id', 'localid'])
            type_col = self._find_column(columns, ['messagetype', 'msgtype', 'type'])
            status_col = self._find_column(columns, ['msgstatus', 'status'])
            source_col = self._find_column(columns, ['msgsource', 'source'])
            
            # 构建查询语句
            select_fields = []
            field_mapping = {}
            
            if sender_col:
                select_fields.append(sender_col)
                field_mapping['sender'] = sender_col
            
            if time_col:
                select_fields.append(time_col)
                field_mapping['time'] = time_col
            
            if content_col:
                select_fields.append(content_col)
                field_mapping['content'] = content_col
            
            if msgid_col:
                select_fields.append(msgid_col)
                field_mapping['msgid'] = msgid_col
            
            if type_col:
                select_fields.append(type_col)
                field_mapping['type'] = type_col
            
            # 添加其他可能有用的字段
            for col in columns:
                if col not in select_fields and col not in ['rowid']:
                    select_fields.append(col)
            
            if not select_fields:
                logger.warning(f"表 {table_name} 无可提取字段")
                return messages
            
            # 分批查询，避免内存问题
            batch_size = 1000
            offset = 0
            
            while True:
                query = f"SELECT {', '.join(select_fields)} FROM {table_name} LIMIT {batch_size} OFFSET {offset}"
                cursor.execute(query)
                rows = cursor.fetchall()
                
                if not rows:
                    break
                
                for row in rows:
                    message = {
                        'database_path': db_info['path'],
                        'database_type': db_info['type'],
                        'table_name': table_name,
                        'extracted_at': datetime.now().isoformat()
                    }
                    
                    # 映射字段值
                    for i, field in enumerate(select_fields):
                        value = row[i] if i < len(row) else None
                        
                        # 处理bytes类型的数据
                        if isinstance(value, bytes):
                            try:
                                # 尝试解码为UTF-8字符串
                                value = value.decode('utf-8')
                            except UnicodeDecodeError:
                                # 如果解码失败，转换为十六进制字符串
                                value = value.hex()
                        
                        # 特殊处理一些字段
                        if field == field_mapping.get('time') and value:
                            # 尝试转换时间戳
                            message['timestamp'] = self._convert_timestamp(value)
                            message['timestamp_raw'] = value
                        elif field == field_mapping.get('sender'):
                            message['sender'] = value
                        elif field == field_mapping.get('content'):
                            message['content'] = value
                        elif field == field_mapping.get('msgid'):
                            message['message_id'] = value
                        elif field == field_mapping.get('type'):
                            message['message_type'] = value
                        else:
                            message[field] = value
                    
                    messages.append(message)
                
                offset += batch_size
                
                # 记录进度
                if offset % 10000 == 0:
                    logger.info(f"已提取表 {table_name} 中 {offset} 条记录...")
            
            logger.info(f"表 {table_name} 提取完成，总计 {len(messages)} 条记录")
            
        except Exception as e:
            logger.error(f"提取表 {table_name} 数据失败: {e}")
        
        return messages
    
    def _find_column(self, columns: List[str], candidates: List[str]) -> Optional[str]:
        """在字段列表中查找匹配的字段"""
        for candidate in candidates:
            for column in columns:
                if candidate.lower() in column.lower():
                    return column
        return None
    
    def _convert_timestamp(self, timestamp: Any) -> Optional[str]:
        """转换时间戳为ISO格式"""
        try:
            if isinstance(timestamp, (int, float)):
                # 尝试不同的时间戳格式
                if timestamp > 1e12:  # 毫秒时间戳
                    dt = datetime.fromtimestamp(timestamp / 1000)
                elif timestamp > 1e9:  # 秒时间戳
                    dt = datetime.fromtimestamp(timestamp)
                else:
                    return None
                return dt.isoformat()
            elif isinstance(timestamp, str):
                # 尝试解析字符串时间
                try:
                    dt = datetime.fromisoformat(timestamp)
                    return dt.isoformat()
                except:
                    return timestamp
        except Exception:
            pass
        return None
    
    def extract_all_chats(self) -> None:
        """提取所有数据库中的聊天记录"""
        logger.info("\n🚀 开始提取所有聊天记录...")
        logger.info(f"📋 待处理数据库: {len(self.databases)} 个")
        
        total_messages = 0
        processed_dbs = 0
        
        # 优先处理Message类型的数据库
        message_dbs = [db for db in self.databases if db['type'] == 'Message']
        other_dbs = [db for db in self.databases if db['type'] != 'Message']
        
        for db_info in message_dbs + other_dbs:
            logger.info(f"\n📊 处理数据库: {Path(db_info['path']).name} (类型: {db_info['type']})")
            
            conn = self.connect_database(db_info)
            if not conn:
                continue
            
            try:
                # 获取所有表
                tables = self.get_table_names(conn)
                
                # 查找聊天表
                chat_tables = self.find_chat_tables(tables)
                
                if not chat_tables:
                    logger.info(f"📝 数据库中无聊天表")
                    continue
                
                # 处理每个聊天表
                for table_name in chat_tables:
                    is_valid, columns = self.validate_chat_table(conn, table_name)
                    
                    if not is_valid:
                        continue
                    
                    # 提取数据
                    messages = self.extract_chat_data(conn, table_name, columns, db_info)
                    self.chat_data.extend(messages)
                    total_messages += len(messages)
                
                processed_dbs += 1
                
            finally:
                conn.close()
        
        logger.info(f"\n🎉 提取完成!")
        logger.info(f"📊 处理了 {processed_dbs} 个数据库")
        logger.info(f"💬 总计提取 {total_messages} 条聊天记录")
    
    def save_to_json(self, output_path: str) -> None:
        """保存数据到JSON文件"""
        try:
            output_file = Path(output_path)
            
            # 创建输出目录
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 准备输出数据
            output_data = {
                'metadata': {
                    'extracted_at': datetime.now().isoformat(),
                    'total_messages': len(self.chat_data),
                    'total_databases': len(self.databases),
                    'source_keys_file': str(self.keys_file_path)
                },
                'messages': self.chat_data
            }
            
            # 保存JSON文件
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"💾 数据已保存到: {output_file}")
            logger.info(f"📏 文件大小: {output_file.stat().st_size / (1024*1024):.2f} MB")
            
        except Exception as e:
            logger.error(f"保存JSON文件失败: {e}")
            raise
    
    def run(self, output_path: str) -> None:
        """运行完整的提取流程"""
        try:
            # 加载配置
            self.load_keys()
            
            if not self.databases:
                logger.error("未找到有效的数据库")
                return
            
            # 提取聊天记录
            self.extract_all_chats()
            
            if not self.chat_data:
                logger.warning("未提取到任何聊天记录")
                return
            
            # 保存结果
            self.save_to_json(output_path)
            
        except Exception as e:
            logger.error(f"提取过程失败: {e}")
            raise


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='WeChat聊天记录提取工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用示例:
  python wechat_chat_extractor.py .keys
  python wechat_chat_extractor.py /path/to/.keys -o output.json
  python wechat_chat_extractor.py .keys -o /path/to/output.json
  python wechat_chat_extractor.py .keys --show-tables
  python wechat_chat_extractor.py .keys --show-tables -v
  python wechat_chat_extractor.py .keys --test-info
  python wechat_chat_extractor.py .keys --csv-tables tables.csv

注意:
  - 需要安装依赖: pip install pysqlcipher3
  - .keys文件应包含数据库路径和解密密钥
  - 输出的JSON文件可能很大，请确保有足够的磁盘空间
  - 使用 --show-tables 查看数据库和表信息而不提取数据
  - 使用 --test-info 查看数据库连接信息
  - 使用 --csv-tables 导出聊天表信息到CSV文件
        """
    )
    
    parser.add_argument('keys_file', help='.keys文件路径')
    parser.add_argument('-o', '--output', default='wechat_chat_export.json', 
                       help='输出JSON文件路径 (默认: wechat_chat_export.json)')
    parser.add_argument('-v', '--verbose', action='store_true', 
                       help='显示详细日志')
    parser.add_argument('--test-info', action='store_true',
                       help='仅显示数据库路径和密钥信息，适合复制到其他应用测试')
    parser.add_argument('--show-tables', action='store_true',
                       help='仅显示每个数据库和其中的表信息，不读取表格内容')
    parser.add_argument('--csv-tables', 
                       help='导出聊天表信息到CSV文件，包含数据库名、地址、表名等信息')
    
    args = parser.parse_args()
    
    # 设置日志级别
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # 测试信息模式
    if args.test_info:
        # 禁用日志输出
        logging.getLogger().setLevel(logging.ERROR)
        
        extractor = WeChatChatExtractor(args.keys_file)
        extractor.load_keys()
        
        print("# WeChat数据库连接信息")
        print("# 格式: 路径 | 密钥 | cipher_compatibility")
        print("# " + "="*80)
        
        for db in extractor.databases:
            print(f"路径: {db['path']}")
            print(f"密钥: {db['key']}")
            print(f"cipher_compatibility: {db['cipher_compatibility']}")
            print("-" * 80)
        
        return
    
    # 显示表信息模式
    if args.show_tables:
        # 设置简洁日志
        logging.getLogger().setLevel(logging.INFO)
        
        extractor = WeChatChatExtractor(args.keys_file)
        extractor.load_keys()
        
        print("# WeChat数据库表信息")
        print("# " + "="*80)
        
        for db_info in extractor.databases:
            print(f"\n📁 数据库: {Path(db_info['path']).name}")
            print(f"   类型: {db_info['type']}")
            print(f"   路径: {db_info['path']}")
            print(f"   大小: {os.path.getsize(db_info['path']):,} bytes")
            
            # 尝试连接数据库
            conn = extractor.connect_database(db_info)
            if conn:
                try:
                    # 获取所有表
                    tables = extractor.get_table_names(conn)
                    print(f"   表数量: {len(tables)}")
                    
                    # 查找聊天表
                    chat_tables = extractor.find_chat_tables(tables)
                    print(f"   聊天表数量: {len(chat_tables)}")
                    
                    if chat_tables:
                        print("   聊天表:")
                        for table in chat_tables:
                            print(f"     - {table}")
                    
                    # 显示所有表（可选）
                    if args.verbose:
                        print(f"   所有表 ({len(tables)}):")
                        for table in tables:
                            print(f"     - {table}")
                    
                finally:
                    conn.close()
            else:
                print("   ❌ 连接失败")
            
            print("   " + "-"*60)
        
        return
    
    # CSV导出聊天表信息模式
    if args.csv_tables:
        # 设置简洁日志
        logging.getLogger().setLevel(logging.INFO)
        
        extractor = WeChatChatExtractor(args.keys_file)
        extractor.load_keys()
        
        print(f"📊 导出聊天表信息到CSV文件: {args.csv_tables}")
        
        # 收集所有聊天表信息
        table_info = []
        
        for db_info in extractor.databases:
            print(f"🔍 处理数据库: {Path(db_info['path']).name}")
            
            # 尝试连接数据库
            conn = extractor.connect_database(db_info)
            if conn:
                try:
                    # 获取所有表
                    tables = extractor.get_table_names(conn)
                    
                    # 查找聊天表
                    chat_tables = extractor.find_chat_tables(tables)
                    
                    for table_name in chat_tables:
                        # 验证表并获取字段信息
                        is_valid, columns = extractor.validate_chat_table(conn, table_name)
                        
                        if is_valid:
                            # 获取表的记录数
                            try:
                                cursor = conn.cursor()
                                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                                row_count = cursor.fetchone()[0]
                            except:
                                row_count = 0
                            
                            table_info.append({
                                'database_name': Path(db_info['path']).name,
                                'database_type': db_info['type'],
                                'database_path': db_info['path'],
                                'database_size': os.path.getsize(db_info['path']),
                                'table_name': table_name,
                                'table_type': 'chat',
                                'row_count': row_count,
                                'column_count': len(columns),
                                'columns': ', '.join(columns),
                                'key': db_info['key'],
                                'cipher_compatibility': db_info['cipher_compatibility'],
                                'extracted_at': datetime.now().isoformat()
                            })
                    
                finally:
                    conn.close()
            else:
                print(f"❌ 无法连接数据库: {Path(db_info['path']).name}")
        
        # 导出到CSV文件
        if table_info:
            csv_path = Path(args.csv_tables)
            csv_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'database_name', 'database_type', 'database_path', 'database_size',
                    'table_name', 'table_type', 'row_count', 'column_count', 'columns',
                    'key', 'cipher_compatibility', 'extracted_at'
                ]
                
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(table_info)
            
            print(f"✅ CSV文件已保存: {csv_path}")
            print(f"📊 导出了 {len(table_info)} 个聊天表的信息")
            print(f"📏 文件大小: {csv_path.stat().st_size / 1024:.2f} KB")
            
        else:
            print("⚠️ 未找到任何有效的聊天表")
        
        return
    
    # 检查输入文件
    if not os.path.exists(args.keys_file):
        print(f"错误: keys文件不存在: {args.keys_file}")
        sys.exit(1)
    
    logger.info("🚀 WeChat聊天记录提取工具")
    logger.info(f"📁 Keys文件: {args.keys_file}")
    logger.info(f"📄 输出文件: {args.output}")
    
    try:
        extractor = WeChatChatExtractor(args.keys_file)
        extractor.run(args.output)
        
        logger.info("✅ 提取完成!")
        
    except KeyboardInterrupt:
        logger.info("❌ 用户中断操作")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ 提取失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()