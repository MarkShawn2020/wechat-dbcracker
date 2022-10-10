"""
source: own
author: https://github.com/MarkShawn2020
create: 8月 24, 2022, 03:19
"""
import json
from urllib.parse import quote

from log import get_logger

logger = get_logger('utils-log')


class BytesEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, bytes):
            return str(obj)
        return json.JSONEncoder.default(self, obj)


def jsonDump(obj, fp: str, **kwargs):
    with open(fp, "w") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False, cls=BytesEncoder, **kwargs)
        logger.info('dumped into file://' + fp)
