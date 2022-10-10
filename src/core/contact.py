from typing import List, Optional

from path import DATA_DIR
from utils.log import get_logger
from utils.datetime import getCurTime
from utils.interface import IContact
from utils.json import jsonDump
from utils.db import cursor2dictList, getMsgKeyFromWxid

from .db import DB
from .db_center import DBCenter

logger = get_logger('Contact')


class Contact:

    def __init__(self, data: IContact, dbc: DBCenter):
        self._data = data
        self._dbc = dbc

    def __str__(self):
        return f'Contact(wxid={self.wxid}, name={self.name}, chatsKey={self._chatsKey})'

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
    def msgDbName(self) -> Optional[str]:
        """
        数据库的名字（文件位置）
        :return:
        """
        return self._dbc.chatsMap.get(self._chatsKey, None)

    @property
    def _msgDb(self) -> Optional[DB]:
        if self.msgDbName:
            return self._dbc.dbs[self.msgDbName]

    @property
    def _chatsKey(self) -> str:
        """
        聊天记录的表名，每张表对应一个好友、群的聊天记录
        :return:
        """
        return getMsgKeyFromWxid(self.wxid)

    def queryChatHistory(self) -> Optional[List[dict]]:
        """
        :return: 聊天记录
        """
        if self._msgDb:
            return cursor2dictList(self._msgDb.conn.execute(f"select * from {self._chatsKey}"))

    def dumpChatHistory(self, dumpPath=None):
        if not self._msgDb:
            return
        if dumpPath is None:
            dumpPath = str(DATA_DIR / "out" / f'{self.name}_{getCurTime()}.json')
        logger.debug(f'dumping into file://{dumpPath}')
        chatHistory = self.queryChatHistory()
        logger.debug(f"chat history: {chatHistory}")

        jsonDump(chatHistory, dumpPath)
