#!/usr/sbin/dtrace -s

#pragma D option quiet


/* Crypto Key */

pid$target:libcommonCrypto.dylib:CCCrypt:entry
/arg0 == 1 && arg1 == 4/
{
    self->buf = arg0 == 0 ? arg6 : arg8;
    self->buf_size = arg0 == 0 ? arg7 : arg9;
    self->key = copyin(arg3, arg4);
    printf("[%d] op = %d, alg = %d, buf_size = %d\n",
            tid, arg0, arg1, self->buf_size);
    tracemem(self->key, 32);
}


/* Database File Access (adapted from `macos/dbcracker.d`) */

typedef struct sqlcipher_provider sqlcipher_provider;
typedef struct Btree Btree;

typedef struct cipher_ctx {
    int store_pass;
    int derive_key;
    int kdf_iter;
    int fast_kdf_iter;
    int key_sz;
    int iv_sz;
    int block_sz;
    int pass_sz;
    int reserve_sz;
    int hmac_sz;
    int keyspec_sz;
    unsigned int flags;
    unsigned char *key;
    unsigned char *hmac_key;
    unsigned char *pass;
    char *keyspec;
    sqlcipher_provider *provider_;
    void *provider_ctx;
} cipher_ctx;

typedef struct codec_ctx {
    int kdf_salt_sz;
    int page_sz;
    unsigned char *kdf_salt;
    unsigned char *hmac_kdf_salt;
    unsigned char *buffer;
    Btree *pBt;
    cipher_ctx *read_ctx;
    cipher_ctx *write_ctx;
    unsigned int skip_read_hmac;
    unsigned int need_kdf_salt;
} codec_ctx;

syscall::open:entry
/pid == $target && strstr(basename(copyinstr(arg0)), "Backup.db") != 0/
{
    self->path = copyinstr(arg0);
    printf("\nsqlcipher '%s'\n", self->path);
    trace("--------------------------------------------------------------------------------\n");
}

pid$target:WCDB:sqlcipher_cipher_ctx_key_derive:entry
{
    self->ctx_u = arg0;
    self->c_ctx_u = arg1;
}

pid$target:WCDB:sqlcipher_cipher_ctx_key_derive:return
{
    self->ctx = (codec_ctx *) copyin(self->ctx_u, sizeof(codec_ctx));
    self->c_ctx = (cipher_ctx *) copyin(self->c_ctx_u, sizeof(cipher_ctx));

    printf("PRAGMA key = \"%s\";\n",
            copyinstr((user_addr_t) self->c_ctx->keyspec,
                self->c_ctx->keyspec_sz));

    printf("PRAGMA cipher_compatibility = 3;\n");
    printf("PRAGMA kdf_iter = %d;\n", self->c_ctx->kdf_iter);
    printf("PRAGMA cipher_page_size = %d;\n", self->ctx->page_sz);
    printf("\n");

    self->ctx_u = 0;
    self->c_ctx_u = 0;
    self->ctx = 0;
    self->c_ctx = 0;
}


/* Backup File Access */
/* FIXME: what about "BAK_1_TEXT" or "BAK_1_MEDIA"? */

syscall::open:entry
/pid == $target && strstr(basename(copyinstr(arg0)), "BAK_0_TEXT") != 0/
{
    self->text = arg0;
}

syscall::open:entry
/pid == $target && strstr(basename(copyinstr(arg0)), "BAK_0_MEDIA") != 0/
{
    self->media = arg0;
}

syscall::open:return
/pid == $target && self->text/
{
    printf("[%d] OPEN %s as %d\n", tid, copyinstr(self->text), arg1);
    self->text = 0;
    self->text_fd = arg1;
}

syscall::open:return
/pid == $target && self->media/
{
    printf("[%d] OPEN %s as %d\n", tid, copyinstr(self->media), arg1);
    self->media = 0;
    self->media_fd = arg1;
}

syscall::close:entry
/pid == $target && arg0 == self->text_fd/
{
    printf("[%d] CLOSE TEXT %d\n", tid, self->text_fd);
}

syscall::close:entry
/pid == $target && arg0 == self->media_fd/
{
    printf("[%d] CLOSE MEDIA %d\n", tid, self->text_fd);
}


/* Backup File I/O */

syscall::write:entry
/pid == $target && arg0 == self->text_fd/
{
    printf("[%d] WRITE %d bytes to TEXT %d\n", tid, arg2, arg0);
}

syscall::write:entry
/pid == $target && arg0 == self->media_fd/
{
    printf("[%d] WRITE %d bytes to MEDIA %d\n", tid, arg2, arg0);
}
