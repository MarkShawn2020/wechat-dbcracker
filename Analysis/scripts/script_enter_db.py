from utils import auth_db, get_tables_of_conn
from utils.db import md5

conn = auth_db("IGroup/group_new.db")

tables = get_tables_of_conn(conn)

print(tables)

group_contacts = list(conn.execute("select * from GroupContact"))

group_yhsjy = [i for i in group_contacts if "樱花三结义" in i[2]][0]

group_yhsjy_wxid_md5 = md5(group_yhsjy[0])

print(group_yhsjy_wxid_md5, group_yhsjy)
