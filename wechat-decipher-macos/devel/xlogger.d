#!/usr/sbin/dtrace -w -s

#pragma D option quiet

/*
 * Set the global variable `gs_level' in xloggerbase.c to zero, so that
 * `xlogger_Level()' always return zero, enabling DEBUG level messages.
 *
 * TODO:
 *   1. Figure out why `gs_level' is automatically restored on exit.
 *   2. Decode the MOV instruction under PC instead of hardcoding the offset.
 */
pid$target:WeChat:__xlogger_Level_impl:entry
{
    /*
     * The magic number is calcuated from Hopper's disassembly output.
     * No need to worry about ASLR since we only need relative offsets.
     *
     * For WeChat for macOS v3.0.1.16 (17837) #36bbf5f7d2, we have
     *
     *      0x152904a0  gs_level
     *    - 0x13624e20  __xlogger_Level_impl
     *    ------------
     *       0x1c6b680
     */
    gs_level_addr = uregs[R_PC] + 0x1c6b680;
    zero = (int *) alloca(4);
    *zero = 0;
    copyout(zero, gs_level_addr, 4);
}

pid$target:WeChat:__xlogger_Write_impl:entry
{
    self->logbody = arg1;
}

/*
 * Log some extra information, e.g. the name of the source file/function.
 * See https://github.com/Tencent/mars/blob/master/mars/log/src/formater.cc
 */
pid$target:libsystem_c.dylib:snprintf:entry
/self->logbody && arg1 == 1024/
{
    self->loghead = arg0;
}

pid$target:libsystem_c.dylib:snprintf:return
/self->logbody && self->loghead/
{
    printf("[%Y] %s\n", walltimestamp, copyinstr(self->logbody));

    /* In case you need extra verbosity
     *
    printf("[%Y] <%s> %s\n",
            walltimestamp,
            copyinstr(self->loghead),
            copyinstr(self->logbody));
     */

    self->logbody = self->loghead = 0;
}
