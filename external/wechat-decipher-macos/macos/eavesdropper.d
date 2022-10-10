#!/usr/sbin/dtrace -s

#pragma D option quiet
/* maximum length of each string */
#pragma D option strsize=8k

BEGIN
{
    insert = "INSERT INTO Chat_";
    insert_or_replace = "INSERT OR REPLACE INTO Chat_";
    fields = "(mesLocalID,mesSvrID,msgCreateTime,msgContent,msgStatus,msgImgStatus,messageType,mesDes,msgSource,IntRes1,IntRes2,StrRes1,StrRes2,msgVoiceText,msgSeq,ConBlob) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";

    param[1] = "mesLocalID";
    param[2] = "mesSvrID";
    param[3] = "msgCreateTime";
    param[4] = "msgContent";
    param[5] = "msgStatus";
    param[6] = "msgImgStatus";
    param[7] = "messageType";
    param[8] = "mesDes";
    param[9] = "msgSource";
    param[10] = "IntRes1";
    param[11] = "IntRes2";
    param[12] = "StrRes1";
    param[13] = "StrRes2";
    param[14] = "msgVoiceText";
    param[15] = "msgSeq";
    param[16] = "ConBlob";
}

pid$target:WCDB:sqlite3_prepare_v2:entry
/index(copyinstr(arg1), insert) == 0
 && index(copyinstr(arg1), fields) == 49/
{
    trace("\n================ INSERT ================\n");
    self->in_prepare = 1;
    self->ppStmt = arg3;
    trace(copyinstr(arg1 + 17, 32));
    trace("\n----------------------------------------\n");
}

pid$target:WCDB:sqlite3_prepare_v2:entry
/index(copyinstr(arg1), insert_or_replace) == 0
 && index(copyinstr(arg1), fields) == 60/
{
    trace("\n============ INSERT|REPLACE ============\n");
    self->in_prepare = 1;
    self->ppStmt = arg3;
    trace(copyinstr(arg1 + 28, 32));
    trace("\n----------------------------------------\n");
}

pid$target:WCDB:sqlite3_prepare_v2:return
/self->in_prepare == 1/
{
    self->in_prepare = 0;
    self->stmt = *((user_addr_t *) copyin(self->ppStmt, 8));
}

pid$target:WCDB:sqlite3_bind_null:entry
/arg0 == self->stmt && arg1 <= 16/
{
    printf("%s: NULL\n", param[arg1]);
}

pid$target:WCDB:sqlite3_bind_int64:entry
/arg0 == self->stmt && arg1 <= 16/
{
    printf("%s: %d\n", param[arg1], arg2);
}

pid$target:WCDB:sqlite3_bind_text:entry
/arg0 == self->stmt && arg1 <= 16/
{
    printf("%s: '%s'\n", param[arg1], arg2==0 ? "" : stringof(copyinstr(arg2)));
}

pid$target:WCDB:sqlite3_bind_blob:entry
/arg0 == self->stmt && arg1 <= 16/
{
    printf("%s: See below for first 0x40 out of 0x%X bytes\n", param[arg1], arg3);
    tracemem(copyin(arg2, arg3), 0x40);
}

