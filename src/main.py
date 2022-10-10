from core.db_center import createDBCenter
from utils.find import findEasy


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('search_key')
    parser.add_argument('-g', '--is-group', action='store_true')
    parser.add_argument('-q', '--query-chat-history', action='store_true')
    parser.add_argument('-d', '--dump-chat-history', action='store_true')

    args = parser.parse_args()
    print(args)

    dbc = createDBCenter()
    contact = findEasy(dbc, args.search_key, isGroup=args.is_group)
    print(contact)

    if args.query_chat_history:
        print(contact.queryChatHistory())
    if args.dump_chat_history:
        contact.dumpChatHistory()
