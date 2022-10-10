import hashlib
import os
from sqlite3.dbapi2 import Cursor
from typing import List

from pysqlcipher3 import dbapi2 as sqlite

from log import get_logger

logger = get_logger('utils-db')


def connect_db(
    _db_path,
    _db_key,
    _db_cc: int,
    _db_pagesize: int
):
    logger.debug(f"connecting {_db_path}")
    conn = sqlite.connect(_db_path)
    conn.execute(f'PRAGMA key = "{_db_key}";')
    conn.execute(f"PRAGMA cipher_compatibility = {_db_cc};")
    conn.execute(f"PRAGMA cipher_page_size = {_db_pagesize};")
    conn.commit()
    logger.debug("committed")
    return conn


def dropFromList(_elements: List, _toDrops: List) -> List:
    for _toDrop in _toDrops:
        if _toDrop in _elements:
            _elements.remove(_toDrop)
    return _elements


def dropDS_Store(_elements: List) -> List:
    return dropFromList(_elements, [".DS_Store"])


def findDbs(fp: str):
    assert os.path.exists(fp)
    dbs = []
    for dirpath, dirnames, filenames in os.walk(fp):
        for filename in filenames:
            fp = os.path.join(dirpath, filename)
            if filename.endswith(".db"):
                dbs.append(fp)
    return sorted(dbs)


def md5(s: str) -> str:
    # ref: - [(25条消息) Python之MD5加密_毕来生-CSDN博客](https://blog.csdn.net/qq_878799579/article/details/74324869)
    hl = hashlib.md5()
    hl.update(s.encode(encoding="utf-8"))
    return hl.hexdigest()


def genFindSql(name, table_name, ambiguous=False, fromRemark=True, fromNickname=True, fromAliasName=True) -> str:
    """
    sqlite wehre 搜索参考: https://www.sqlitetutorial.net/sqlite-where/
    :param name:
    :param table_name:
    :param ambiguous:
    :param fromRemark:
    :param fromNickname:
    :param fromAliasName:
    :return:
    """
    # sqlite的模糊搜索
    conditionLaterPart = f"LIKE '%{name}%'" if ambiguous else f"= '{name}'"

    if fromAliasName:
        condition = "m_nsAliasName " + conditionLaterPart
    else:
        conditions = []
        if fromRemark:
            conditions.append("m_nsRemark " + conditionLaterPart)
        if fromNickname:
            conditions.append("nickname " + conditionLaterPart)
        condition = " OR ".join(conditions)
    s = f"select * FROM {table_name} WHERE {condition}"
    logger.debug("query: " + s)
    return s


def cursor2dictList(cursor: Cursor) -> List[dict]:
    """
    这里面比较tricy的点在于，cursor的description是一个二维数组，每个key都有好几个位置表示不同信息（但只有第一个位置是键名），所以较为复杂
    参考：- [python - How can I get dict from sqlite query? - Stack Overflow](https://stackoverflow.com/questions/3300464/how-can-i-get-dict-from-sqlite-query)
    :param cursor:
    :return:
    """
    keys = list(zip(*cursor.description))[0]
    return [dict(zip(keys, row)) for row in cursor]


def getMsgKeyFromWxid(wxid: str):
    return "Chat_" + md5(wxid)
