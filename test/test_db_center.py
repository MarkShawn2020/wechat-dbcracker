from unittest import TestCase

from support.find import findEasy
from db_center import createDBCenter


class TestWechatDecryptDbs(TestCase):

    def setUp(self) -> None:
        self.wdd = createDBCenter()

    def test_queryChartHistory(self):
        contact = findEasy(self.wdd, "宇冷", isGroup=False)
        contact.dumpChatHistory()
