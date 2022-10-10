"""
source: own
author: https://github.com/MarkShawn2020
create: 8月 24, 2022, 03:27
"""
from datetime import datetime


def getCurTime():
    return datetime.now().strftime('%m-%dT%H-%M')
