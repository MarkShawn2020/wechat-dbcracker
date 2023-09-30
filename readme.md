# python driver for cracking/hacking wechat on macOS

- version: 0.0.2 
- date: 2022/07/04
- author: markshawn

## environment preparation

### init sqlcipher

1. check where is your `libcrypto.a`

```shell
find /usr/local/Cellar -name libcrypto.a
```

2. use the libcrypto.a with openssl version >= 3

```shell
LIBCRYPTO={YOUR-libcrypto.a}
```

3. install

```shell

git clone https://github.com/sqlcipher/sqlcipher
cd sqlcipher
 
./configure --enable-tempstore=yes CFLAGS="-DSQLITE_HAS_CODEC" \
	LDFLAGS=$LIBCRYPTO --with-crypto-lib=none
	
make && make install

cd ..
```

### init pysqlcipher

```shell

git clone https://github.com/rigglemania/pysqlcipher3
cd pysqlcipher3

mkdir amalgamation && cp ../sqlcipher/sqlite3.[hc] amalgamation/
mkdir src/python3/sqlcipher && cp  amalgamation/sqlite3.h src/python3/sqlcipher/

python setup.py build_amalgamation
python setup.py install

cd ..
```

### disable SIP, otherwise the dtrace can't be used

```shell
# check SIP
csrutil status

# disable SIP, need in recovery mode (hold on shift+R when rebooting)
csrutil disable
```

## hook to get wechat database secret keys

### 1. 打开mac微信，保持登录页面

### 2. 运行监控程序

```shell
# comparing to `wechat-decipher-macos`, I make the script more robust.
pgrep -f '^/Applications/WeChat.app/Contents/MacOS/WeChat' | xargs sudo wechat-decipher-macos/macos/dbcracker.d -p
```

### 3. 登录账号，确认是否有各种数据库键的输出

类似如下：

```text
sqlcipher db path: '/Users/mark/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/KeyValue/1d35a41b3adb8b335cc59362ad55ee88/KeyValue.db'
PRAGMA key = "x'b95e58f5e48a455f935963f7f8bdec37a0205f799d8c4465b4c00b7138f516263363959d13f82ce5b9e0c3a74af1df1e'"; PRAGMA cipher_compatibility = 3;

sqlcipher db path: '/Users/mark/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/1d35a41b3adb8b335cc59362ad55ee88/Contact/wccontact_new2.db'
PRAGMA key = "x'b95e58f5e48a455f935963f7f8bdec37a0205f799d8c4465b4c00b7138f51626b07475fbaa4b375dbc932419c1ee54d2'"; PRAGMA cipher_compatibility = 3;

...
```

如果没有，提示SIP，则参见之前的步骤；

如果没有，也不是SIP，则我也不知道啥原因，请联系我 :)

如果有，则说明运行成功，你可以把输出内容拷贝到`data/dbcracker.log`文件内（没有就新建一个）。

以后，可以直接使用以下自动往目标文件写入关键信息（而无需手动拷贝）：

```shell
# monitor into log file, so that to be read by our programme
pgrep -f '^/Applications/WeChat.app/Contents/MacOS/WeChat' | xargs sudo wechat-decipher-macos/macos/dbcracker.d -p > data/dbcracker.log
```

## python sdk

在有了`data/dbcracker.log`文件之后，就可以使用我们封装的sdk，它会自动解析数据库，并提供我们的日常使用功能。

### inspect all your local wechat databases

```shell
# change to your app data path
 cd  '/Users/mark/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/'
```

```text
(venv) 2022/07/04 11:27:23 (base) ➜  2.0b4.0.9 git:(master) ✗ tree --prune -P "*.db"
.
├── 1d35a41b3adb8b335cc59362ad55ee88
│   ├── Account
│   │   └── Beta.db
│   ├── ChatSync
│   │   └── ChatSync.db
│   ├── Contact
│   │   └── wccontact_new2.db
│   ├── Favorites
│   │   └── favorites.db
│   ├── FileStateSync
│   │   └── filestatesync.db
│   ├── Group
│   │   └── group_new.db
│   ├── MMLive
│   │   └── live_main.db
│   ├── Message
│   │   ├── fileMsg.db
│   │   ├── fts
│   │   │   └── ftsmessage.db
│   │   ├── ftsfile
│   │   │   └── ftsfilemessage.db
│   │   ├── msg_0.db
│   │   ├── msg_1.db
│   │   ├── msg_2.db
│   │   ├── msg_3.db
│   │   ├── msg_4.db
│   │   ├── msg_5.db
│   │   ├── msg_6.db
│   │   ├── msg_7.db
│   │   ├── msg_8.db
│   │   └── msg_9.db
│   ├── RevokeMsg
│   │   └── revokemsg.db
│   ├── Session
│   │   └── session_new.db
│   ├── Stickers
│   │   └── stickers.db
│   ├── Sync
│   │   ├── openim_oplog.db
│   │   └── oplog_1.1.db
│   ├── solitaire
│   │   └── solitaire_chat.db
│   └── voip
│       └── multiTalk
│           └── multiTalk.db
├── Backup
│   └── 1d35a41b3adb8b335cc59362ad55ee88
│       ├── A2158f8233bc48b5
│       │   └── Backup.db
│       └── F10A43B8-5032-4E21-A627-F26663F39304
│           └── Backup.db
└── KeyValue
    └── 1d35a41b3adb8b335cc59362ad55ee88
        └── KeyValue.db

24 directories, 30 files
```

### python environment preparation

```shell
pip install virtualenv
virtualenv venv
source venv/bin/python
pip install -r requirements.txt
```

### test all the database keys

```shell
python src/main.py
```

## ref

- https://github.com/nalzok/wechat-decipher-macos
- https://github.com/sqlcipher/sqlcipher
- https://github.com/rigglemania/pysqlcipher3
- [Mac终端使用Sqlcipher加解密基础过程详解_Martin.Mu `s Special Column-CSDN博客_mac sqlcipher](https://blog.csdn.net/u011195398/article/details/85266214)
