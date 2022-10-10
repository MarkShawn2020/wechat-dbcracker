"""
available database paths:
[KeyValue, Backup, Stickers, IContact, IGroup, Favorites, Message, MMLive, ChatSnc, solitaire, Sync, Account, Session, RevokeMsg]

./KeyValue/1d35a41b3adb8b335cc59362ad55ee88/KeyValue.db
./Backup/1d35a41b3adb8b335cc59362ad55ee88/A2158f8233bc48b5/Backup.db
./Backup/1d35a41b3adb8b335cc59362ad55ee88/F10A43B8-5032-4E21-A627-F26663F39304/Backup.db
./1d35a41b3adb8b335cc59362ad55ee88/solitaire/solitaire_chat.db
./1d35a41b3adb8b335cc59362ad55ee88/Stickers/stickers.db
./1d35a41b3adb8b335cc59362ad55ee88/IContact/wccontact_new2.db
./1d35a41b3adb8b335cc59362ad55ee88/MMLive/live_main.db
./1d35a41b3adb8b335cc59362ad55ee88/IGroup/group_new.db
./1d35a41b3adb8b335cc59362ad55ee88/FileStateSync/filestatesync.db
./1d35a41b3adb8b335cc59362ad55ee88/Favorites/favorites.db
./1d35a41b3adb8b335cc59362ad55ee88/ChatSync/ChatSync.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_1.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_5.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_4.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_0.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/fts/ftsmessage.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/fileMsg.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_7.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_3.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_2.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_6.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/ftsfile/ftsfilemessage.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_9.db
./1d35a41b3adb8b335cc59362ad55ee88/Message/msg_8.db
./1d35a41b3adb8b335cc59362ad55ee88/voip/multiTalk/multiTalk.db
./1d35a41b3adb8b335cc59362ad55ee88/Sync/openim_oplog.db
./1d35a41b3adb8b335cc59362ad55ee88/Sync/oplog_1.1.db
./1d35a41b3adb8b335cc59362ad55ee88/Account/Beta.db
./1d35a41b3adb8b335cc59362ad55ee88/RevokeMsg/revokemsg.db
./1d35a41b3adb8b335cc59362ad55ee88/Session/session_new.db

"""

import os

from branch.config import WDB_ROOT
from support.db import dropDS_Store, findDbs


class WechatLocalDatabases:

    def __init__(self,
                 _wdb_root=None,
                 _wdb_version=None,
                 _wdb_user=None
                 ):
        """
        mac专用
        """
        self._wdb_root = _wdb_root or WDB_ROOT
        assert os.path.exists(self._wdb_root), f"not exist: {self._wdb_root}"

        if not _wdb_version:
            _wdb_versions = dropDS_Store(os.listdir(self._wdb_root))
            assert len(_wdb_versions) == 1, f"more than one version: {_wdb_versions}"
            _wdb_version = _wdb_versions[0]
        self._wdb_version = _wdb_version  # mine: "2.0b4.0.9"

        wdb_version_path = os.path.join(self._wdb_root, self._wdb_version)
        if not _wdb_user:
            _wdb_users = [i for i in os.listdir(wdb_version_path) if len(i) == 32]
            assert len(_wdb_users) == 1, f"more than one user: {_wdb_users}"
            _wdb_user = _wdb_users[0]
        self._wdb_user = _wdb_user

        self.wdb_user_path = os.path.join(wdb_version_path, self._wdb_user)

    def checkLocalDbs(self):
        """
        用来检查本地的数据库情况
        :return:
        """
        dbs = {}
        for db_feature in dropDS_Store(os.listdir(self.wdb_user_path)):
            dbs[db_feature] = findDbs(os.path.join(self.wdb_user_path, db_feature))
        dbs = dict(sorted(dbs.items(), key=lambda x: -len(x[1])))

        print("[available database]")
        for db_feature, db_paths in dbs.items():
            print(f"- {db_feature} ({len(db_paths)})")
            for db_path in db_paths:
                print("     " + os.path.basename(db_path))

    @property
    def messagesPath(self):
        return os.path.join(self.wdb_user_path, "Message")

    @property
    def groupsPath(self):
        return os.path.join(self.wdb_user_path, "IGroup")

    def getGroupDbPath(self, _group_db_name: str = "group_new.db"):
        if not _group_db_name:
            _group_db_names = dropDS_Store(os.listdir(self.groupsPath))
            assert len(_group_db_names) == 1, f"more than one db: {_group_db_names}"
            _group_db_name = _group_db_names[0]
        return os.path.join(self.groupsPath, _group_db_name)

    def getMessageDbPath(self, i: int):
        msg_db_path = os.path.join(self.messagesPath, f"msg_{i}.db")
        assert os.path.exists(msg_db_path), "not exist: " + msg_db_path
        return msg_db_path

    # def getDbMsgs(dbc):
    #     if not dbc.dbMsgs:
    #         for msg_db_name in os.listdir(dbc.messagesPath):
    #             if msg_db_name.startswith("msg"):
    #                 dbc.dbMsgs.append()
    #
    #
    #     return dbc.dbMsgs


if __name__ == '__main__':
    wdb = WechatLocalDatabases(_wdb_user="1d35a41b3adb8b335cc59362ad55ee88")
