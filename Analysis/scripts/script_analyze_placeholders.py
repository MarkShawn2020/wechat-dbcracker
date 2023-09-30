from pprint import pprint

file = "../data/out/old/chats-朱思奕-merged.json"

import re
from collections import defaultdict

stat = defaultdict(int)

with open(file, "r") as f:
    for line in f:
        # drop markdown links like: '[]()'
        for matched in re.findall(r"\[(.*?)\](?!\()", line):
            stat[matched] += 1

cnt = 0
for i, j in sorted(stat.items(), key=lambda k: -k[1]):
    print(j, '\t', i)
    cnt += j

print(f"\ntotal: {cnt}")
