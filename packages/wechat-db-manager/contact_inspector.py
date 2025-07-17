#!/usr/bin/env python3
"""
临时脚本：检查Contact表结构和MD5匹配
"""

import sys
import os
import hashlib
sys.path.append('../../')

try:
    from pysqlcipher3 import dbapi2 as sqlite
except ImportError as e:
    print(f"缺少必要依赖: {e}")
    print("请安装依赖: pip install pysqlcipher3")
    sys.exit(1)

# Contact数据库信息（从输出中获取）
contact_info = {
    'path': '/Users/mark/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/1d35a41b3adb8b335cc59362ad55ee88/Contact/wccontact_new2.db',
    'key': "x'9ab30be49b344171a35c10dc311bb7150005000bdde748c480a805a6ad8c4868df746f286cd9f518e6d069b0baf77b27'"
}

def inspect_contact_table():
    print("🔍 检查Contact表结构...")
    
    try:
        # 连接数据库
        conn = sqlite.connect(contact_info['path'])
        cursor = conn.cursor()
        
        # 设置密钥
        cursor.execute(f"PRAGMA key = \"{contact_info['key']}\"")
        cursor.execute("PRAGMA cipher_compatibility = 3")
        
        # 测试连接
        cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table'")
        table_count = cursor.fetchone()[0]
        print(f"✅ 成功连接，包含 {table_count} 个表")
        
        # 获取WCContact表结构
        cursor.execute("PRAGMA table_info(WCContact)")
        columns = cursor.fetchall()
        
        print(f"\n📋 WCContact表结构 ({len(columns)} 个字段):")
        print("-" * 80)
        for col in columns:
            cid, name, col_type, notnull, default, pk = col
            print(f"{cid:2d}. {name:30s} {col_type:15s} {'NOT NULL' if notnull else 'NULLABLE':8s} {'PK' if pk else ''}")
        
        # 查看前几条记录的字段名
        print(f"\n📋 前5条记录样本:")
        print("-" * 80)
        cursor.execute("SELECT * FROM WCContact LIMIT 5")
        rows = cursor.fetchall()
        
        for i, row in enumerate(rows):
            print(f"\n记录 {i+1}:")
            for j, (col_info, value) in enumerate(zip(columns, row)):
                field_name = col_info[1]  # 字段名
                if isinstance(value, bytes):
                    try:
                        value = value.decode('utf-8')
                    except:
                        value = f"<bytes:{len(value)}>"
                elif value is None:
                    value = "<NULL>"
                else:
                    value = str(value)
                
                # 只显示重要的字段
                if any(keyword in field_name.lower() for keyword in ['name', 'user', 'display', 'nick', 'alias', 'id']):
                    print(f"  {field_name:25s}: {value[:100]}")
        
        # 特别查找包含username相关的字段
        print(f"\n🔍 查找包含'name'或'user'的字段:")
        print("-" * 80)
        relevant_fields = []
        for col in columns:
            field_name = col[1]
            if any(keyword in field_name.lower() for keyword in ['name', 'user']):
                relevant_fields.append(field_name)
                print(f"  - {field_name}")
        
        # 查看这些字段的具体内容
        if relevant_fields:
            print(f"\n📋 相关字段内容样本:")
            print("-" * 80)
            field_list = ', '.join(relevant_fields)
            cursor.execute(f"SELECT {field_list} FROM WCContact LIMIT 10")
            rows = cursor.fetchall()
            
            for i, row in enumerate(rows):
                print(f"\n记录 {i+1}:")
                for field_name, value in zip(relevant_fields, row):
                    if isinstance(value, bytes):
                        try:
                            value = value.decode('utf-8')
                        except:
                            value = f"<bytes:{len(value)}>"
                    elif value is None:
                        value = "<NULL>"
                    else:
                        value = str(value)
                    print(f"  {field_name:25s}: {value}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")

if __name__ == "__main__":
    inspect_contact_table()