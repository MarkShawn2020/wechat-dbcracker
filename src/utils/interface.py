from enum import Enum
from typing import TypedDict


class IContactSex(int, Enum):
    Unknown = 0
    Male = 1
    Female = 2


class IContact(TypedDict):
    m_nsUsrName: str  # wxid（唯一）

    m_nsRemark: str  # 我给他们的备注
    m_nsRemarkPYFull: str  # 我给他们的备注的全拼
    m_nsRemarkPYShort: str  # 我给他们的备注的简拼

    m_nsHeadImgUrl: str
    m_nsHeadHDImgUrl: str

    nickname: str  # 用户自己的备注 - 群名称
    m_nsFullPY: str  # 基于nickname的全拼

    m_nsAliasName: str  # 用户的微信注册id（唯一） - 群为空

    m_uiSex: IContactSex  # 性别 - 性别始终为0


class IGroup(IContact):
    m_nsChatRoomMemList: str  # ";"拼接的wxid列表
    m_nsChatRoomAdminList: str  # ";"拼接的wxid列表