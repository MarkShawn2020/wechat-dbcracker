from sqlite3.dbapi2 import Cursor
from typing import List

from contact import Contact
from support.db import genFindSql, cursor2dictList

from db_center import DBCenter


def _findContacts(wdd: DBCenter, name, ambiguous=True, fromRemark=True, fromNickname=True, fromAliasName=False) \
        -> List[Contact]:
    cursor: Cursor = wdd.dbOfContact.conn.execute(
        genFindSql(name, "WCContact", ambiguous, fromRemark, fromNickname, fromAliasName))
    return [Contact(i, wdd) for i in cursor2dictList(cursor)]


def _findGroups(wdd: DBCenter, name, ambiguous=True, fromRemark=True, fromNickname=True) \
        -> List[Contact]:
    cursor: Cursor = wdd.dbOfGroup.conn.execute(
        genFindSql(name, "GroupContact", ambiguous, fromRemark, fromNickname, fromAliasName=False))
    return [Contact(i, wdd) for i in cursor2dictList(cursor)]


def find(wdd: DBCenter, name, isGroup, ambiguous=True, fromRemark=True, fromNickname=True, fromAliasName=False) \
        -> List[Contact]:
    """

    :param name:
    :param isGroup:
    :param ambiguous:
    :param fromRemark: remark就是自己给别人的备注，搜人时比较好用
    :param fromNickname: nickname是好友自己的昵称或者群名称
    :param fromAliasName: 为True时，其他两个字段都无效，因为它是微信注册id进行搜索
    :return:
    """
    if isGroup:
        return _findGroups(wdd, name, ambiguous, fromRemark, fromNickname)
    else:
        return _findContacts(wdd, name, ambiguous, fromRemark, fromNickname, fromAliasName)


def findEasy(wdd: DBCenter, name, isGroup) -> Contact:
    if isGroup:
        return _findGroups(wdd, name, ambiguous=True, fromNickname=True, fromRemark=True)[0]
    else:
        return _findContacts(wdd, name, ambiguous=True, fromNickname=True, fromRemark=True, fromAliasName=False)[0]
