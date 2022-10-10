import os
from unittest import TestCase

from support.const import DB_DUMP_PATH, DATA_PATH
from db import DB


class TestDatabaseBase(TestCase):

    def test_get_all_table_names(self):
        db = DB(
            "/Users/mark/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/1d35a41b3adb8b335cc59362ad55ee88/Message/msg_5.db",
            "x'b95e58f5e48a455f935963f7f8bdec37a0205f799d8c4465b4c00b7138f51626594efa722ba20b0d5897dd9fb65f7238'"
        )
        db.open()
        tbs = db.getAllTableNames()
        print("tbs: ", tbs)

    def test_dump_decrypted_of_msg(self):
        db = DB(
            "/Users/mark/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/1d35a41b3adb8b335cc59362ad55ee88/Message/msg_5.db",
            "x'b95e58f5e48a455f935963f7f8bdec37a0205f799d8c4465b4c00b7138f51626594efa722ba20b0d5897dd9fb65f7238'"
        )
        db.open()
        db.dumpDecrypted(os.path.join(DB_DUMP_PATH, "msg_5.db"))

    def test_dump_decrypted_of_backup(self):
        db = DB(
            "/Users/mark/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/Backup/1d35a41b3adb8b335cc59362ad55ee88/F10A43B8-5032-4E21-A627-F26663F39304/Backup.db",
            "x'0da39e568120f0f1a876368d93abf2460607040bbf9a22eec0fc2198576e5cddcb7757b7ccddc024258a9b1dfe1b800a'",
        )
        db.open()
        db.dumpDecrypted(os.path.join(DB_DUMP_PATH, "backup.db"))

    def test_dump_all_decrypted_from_log_file(self):
        with open(os.path.join(DATA_PATH, "dbcracker.log")) as f:

            db_path = db_key = None
            for line in f.readlines():
                if line.startswith("sqlcipher"):
                    db_path = line.split(":", 1)[1].strip()[1:-1]
                elif line.startswith("PRAGMA"):
                    db_key = line.split(";", 1)[0].split("=", 1)[1].strip()[1:-1]
                else:
                    db_path = db_key = None

                if db_path and db_key:
                    # print({"db_path": db_path, "db_key": db_key})
                    db_name = os.path.basename(db_path)
                    db = DB(fp=db_path, key=db_key)
                    db.open()
                    db.dumpDecrypted(os.path.join(DB_DUMP_PATH, db_name))
                    db.close()
