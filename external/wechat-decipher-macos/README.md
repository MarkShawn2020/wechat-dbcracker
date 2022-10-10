# WeChat Deciphers for macOS

This project is grouped into three directories

+ The directory `macos/` holds DTrace scripts for messing with WeChat.app on macOS.
    + `eavesdropper.d` prints the conversation in real-time. It effectively shows database transactions on the fly.
    + `dbcracker.d` reveals locations of the encrypted SQLite3 databases and their credentials. *Since it can only capture secrets when WeChat.app opens these files, you need to perform a login while the script is running.* Simply copy & paste the script output to invoke [SQLCipher](https://github.com/sqlcipher/sqlcipher) and supply the respective `PRAGMA`s.
+ In `pcbakchat/` you can find scripts to parse WeChat's backup files.
    + `gather.d` gathers several pieces of intel required to decrypt the backup.
+ In `devel/` resides utilities for further reverse engineering. They are intended for hackers only, and the end-users of this project are not expected to use them.
    + `xlogger.d` prints the log messages going to `/Users/$USER/Library/Containers/com.tencent.xinWeChat/Data/Library/Caches/com.tencent.xinWeChat/2.0b4.0.9/log/*.xlog`. I made this script [destructive](http://dtrace.org/guide/chp-actsub.html#chp-actsub-4) to overwrite the global variable [`gs_level`](https://github.com/Tencent/mars/blob/master/mars/comm/xlogger/xloggerbase.c#L93).
    + `protobuf_config.py` describes the protobuf format used by the backup files for [protobuf-inspector](https://github.com/mildsunrise/protobuf-inspector).
    + `__handlers__/` contains some handlers to be used with `frida-trace`.
    + `init.js` contains the helper function for `frida-trace`.

## Dependencies

Since `dtrace(1)` is pre-installed on macOS, no dependencies are required to run the scripts. However, you may need to [disable SIP](https://apple.stackexchange.com/questions/208762/now-that-el-capitan-is-rootless-is-there-any-way-to-get-dtrace-working) if you haven't done that yet. In addition, you'll need [SQLCipher](https://github.com/sqlcipher/sqlcipher) to inspect the databases discovered by `dbcracker.d`.

For some scripts in `devel`, you will also need [Frida](https://frida.re) and a (preferably jailbroken) iOS device.

## Usage

For DTrace scripts, launch WeChat and run

```bash
sudo $DECIPHER_SCRIPT -p $(pgrep -f '^/Applications/WeChat.app/Contents/MacOS/WeChat')
```

replace `$DECIPHER_SCRIPT` with `macos/dbcracker.d`, `macos/eavesdropper.d`, `pcbakchat/gather.d`, or `devel/xlogger.d`.

The stuff in `pcbakchat/` is a little involved. See `usage.md` for more details.

## Will Tencent ban my WeChat account?

Hopefully not. Most processing is done offline on the macOS client, and the overhead of DTrace should be negligible, so there is little chance they will catch you.

## Version Information

The production of these scripts involved an excess amount of guesswork and wishful thinking, but at least it works on my machine :)

```
Device Type: MacBookPro14,1
System Version: Version 10.14.6 (Build 18G8022)
System Language: en
WeChat Version: [2021-04-02 17:49:14] v3.0.1.16 (17837) #36bbf5f7d2
WeChat Language: en
Historic Version: [2021-03-29 20:23:50] v3.0.0.16 (17816) #2a4801bee9
Network Status: Reachable via WiFi or Ethernet
Display: *(1440x900)/Retina
```
