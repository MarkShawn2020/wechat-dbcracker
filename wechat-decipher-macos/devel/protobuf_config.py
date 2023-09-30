types = {
    "root": {
        1: ("uint32", "count"),
        2: ("BakChatMsgItem", "list"),
    },
    "BakChatMsgItem": {
        1: ("uint32", "type"),
        2: ("string", "clientMsgId"),
        3: ("SKBuiltinString_t", "fromUserName"),
        4: ("SKBuiltinString_t", "toUserName"),
        5: ("SKBuiltinString_t", "content"),
        6: ("uint32", "msgStatus"),
        7: ("uint32", "clientMsgTime"),
        8: ("string", "msgSource"),
        9: ("uint32", "msgId"),
        10: ("uint32", "mediaIdCount"),
        11: ("SKBuiltinString_t", "mediaId"),
        12: ("SKBuiltinUint32_t", "mediaType"),
        13: ("SKBuiltinBuffer_t", "buffer"),
        14: ("uint32", "bufferLength"),
        15: ("uint32", "bufferType"),
        16: ("uint64", "newMsgId"),
        17: ("uint32", "sequentId"),
        18: ("int64", "clientMsgMillTime"),
        19: ("uint32", "msgFlag"),
    },
    "SKBuiltinString_t": {
        1: ("string", "string"),
    },
    "SKBuiltinUint32_t": {
        1: ("uint32", "uiVal"),
    },
    "SKBuiltinBuffer_t": {
        1: ("uint32", "iLen"),
        2: ("bytes", "buffer"),
    },
}
