import os
from sqlite3.dbapi2 import Cursor
from typing import Optional

from support.const import PAGE_SIZE_BASE
from support.log import logger
from support.db import connect_db


class DBBase:

    def __init__(self,
                 fp,
                 key,
                 cipher_compatibility=3,
                 page_size=PAGE_SIZE_BASE * 1
                 ):
        """
        数据库解密相关的参数
        其中消息、群组等运行在pc端的数据库都是cipher 3版本默认参数；
        而备份数据库需要在此基础之上，设置pagesize为4096（默认1024）
        :param fp:
        :param key:
        :param cipher_compatibility:
        """
        assert os.path.exists(fp), "fp not exist: " + fp
        self._fp = fp
        self._key = key
        self._cipherCompatibility = cipher_compatibility
        self._pageSize = page_size
        self.conn = None
        # 冗余设计
        self.open()

    @property
    def db_name(self):
        return os.path.basename(self._fp)

    @property
    def db_path(self):
        return self._fp

    def getAllTableNames(self):
        """
        get all table names, ref: https://www.sqlitetutorial.net/sqlite-show-tables/
        :return:
        """
        cursor: Cursor = self.conn.execute(
            "SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%';")
        return [item[0] for item in cursor]

    def open(self):
        if not self.conn:
            self.conn = connect_db(
                self._fp,
                self._key,
                self._cipherCompatibility,
                self._pageSize
            )
            # ref: https://stackoverflow.com/a/55986968/9422455
            # dbc.conn.row_factory = sqlite3.Row

    def close(self):
        if not self.conn:
            logger.warning("not alive!")
        else:
            self.conn.close()

    def dumpDecrypted(self, _fp: str):
        """
        how to decrypt, ref: https://stackoverflow.com/a/25132478/9422455
        :param _fp: 可以是相对路径，也可以是绝对路径，会基于当前运行文件夹（`src2`）进行拼接
        :return:
        """
        assert _fp.endswith(".db"), "should end with .db"
        _fp = os.path.join(os.path.dirname(__file__), _fp)  # abs path
        if os.path.exists(_fp):
            os.remove(_fp)  # otherwise cause `pysqlcipher3.dbapi2.OperationalError`
        assert os.path.exists(os.path.dirname(_fp)), "should dir exist"
        assert self.conn is not None, "should db alive"

        self.conn.execute(f"ATTACH DATABASE '{_fp}' AS plaintext KEY '';")
        self.conn.execute(f"SELECT sqlcipher_export('plaintext'); ")
        self.conn.execute(f"DETACH DATABASE plaintext; ")

        logger.info(f"dumped to {_fp}")


class DB(DBBase):

    def __init__(self, fp, key):
        fn = os.path.basename(fp)
        super().__init__(fp, key, 3, page_size=PAGE_SIZE_BASE * (4 if "Backup.db" == fn else 1))
