import json
import os
from typing import Dict, List

from db import DB
from log import get_logger
from support.const import DATA_PATH


logger = get_logger('DBCenter')


class DBCenter:

    def __init__(self):
        self.dbs: Dict[str, DB] = {}  # file_name: DB
        self.chatsMap: Dict[str, str] = {}  # chat_md5: msg_db_no

    def addDatabase(self, fp, key):
        fn = os.path.basename(fp)
        if fn in self.dbs:
            # logger.warning("database existed: " + fn)
            return
        self.dbs[fn] = DB(fp, key)
        logger.debug("added one db: " + fn)

    def addFinish(self):
        # gen chat maps
        for db in self.dbOfMsgs:
            for table_name in db.getAllTableNames():
                # 若不为空，且不等，则报错，以保证唯一性
                assert db.db_name == self.chatsMap.get(table_name, db.db_name)
                self.chatsMap[table_name] = db.db_name

        chatmap_fp = os.path.join(DATA_PATH, "gen", "chatmap.json")
        with open(chatmap_fp, "w") as f:
            json.dump(self.chatsMap, f, indent=2, ensure_ascii=False)
            logger.info(f"generated chatmap to file://{chatmap_fp}")

    @property
    def dbOfContact(self) -> DB:
        return self.dbs["wccontact_new2.db"]

    @property
    def dbOfGroup(self) -> DB:
        return self.dbs["group_new.db"]

    @property
    def dbOfMsgs(self) -> List[DB]:
        return [self.dbs[i] for i in self.dbs if i.startswith("msg")]


def createDBCenter() -> DBCenter:
    dbc = DBCenter()

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
                dbc.addDatabase(db_path, db_key)
        dbc.addFinish()
    return dbc
