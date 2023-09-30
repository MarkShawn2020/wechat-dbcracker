import json

chat_file = "../data/out/old/chats-朱思奕.json"

DROP_EMOJI = True
DROP_IMAGE = True

# including transferred image / quoted message
DROP_REFERENCE = True

chat_list = json.load(open(chat_file))

Cur = None

new_chat_list = []
for chat_item in chat_list:
    content = chat_item["content"]  # type: str
    New = chat_item["sender"]

    if DROP_EMOJI and content.startswith("<msg><emoji"):
        print(f"drop emoji: {chat_item}")
        content = "[emoji]"

    if DROP_IMAGE and content.startswith("<msg><img"):
        print(f"drop image: {chat_item}")
        content = "[image]"

    if DROP_REFERENCE and content.startswith("<?xml"):
        print(f"drop reference: {chat_item}")
        content = "[reference]"

    if New != Cur:
        new_chat_list.append({New: [content]})
    else:
        new_chat_list[-1][Cur].append(content)

    Cur = New

json.dump(new_chat_list, open(chat_file.replace(".json", "-merged.json"), "w"), ensure_ascii=False, indent=2)
