from typing import List
from urllib.parse import quote

from base import DATA_DIR
from log import get_logger
from support.datetime import getCurTime
from support.interface import IContact
from support.json import jsonDump
from support.db import cursor2dictList, getMsgKeyFromWxid

from db import DB
from db_center import DBCenter

logger = get_logger('Contact')


class Contact:

    def __init__(self, data: IContact, dbc: DBCenter):
        self._data = data
        self._dbc = dbc

    @property
    def name(self):
        for key in [
            'm_nsRemark',
            'nickname',
            'm_nsAliasName',
            "m_nsUsrName"
        ]:
            if self._data[key]:
                return self._data[key]
        else:
            raise ValueError

    @property
    def wxid(self) -> str:
        return self._data["m_nsUsrName"]

    @property
    def msgDbName(self) -> str:
        """
        数据库的名字（文件位置）
        :return:
        """
        return self._dbc.chatsMap[self._chatsKey]

    @property
    def _msgDb(self) -> DB:
        return self._dbc.dbs[self.msgDbName]

    @property
    def _chatsKey(self) -> str:
        """
        聊天记录的表名，每张表对应一个好友、群的聊天记录
        :return:
        """
        return getMsgKeyFromWxid(self.wxid)

    def queryChatHistory(self) -> List[dict]:
        """
        :return: 聊天记录
        """
        return cursor2dictList(self._msgDb.conn.execute(f"select * from {self._chatsKey}"))

    def dumpChatHistory(self, dumpPath=None):
        if dumpPath is None:
            dumpPath = str(DATA_DIR / "out" / f'{self.name}_{getCurTime()}.json')
        logger.debug(f'dumping into file://{dumpPath}')
        chatHistory = self.queryChatHistory()
        logger.debug(f"chat history: {chatHistory}")

        jsonDump(chatHistory, dumpPath)
