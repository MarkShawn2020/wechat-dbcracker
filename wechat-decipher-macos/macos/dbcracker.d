#!/usr/sbin/dtrace -s

#pragma D option quiet

/*
 * TODO: Limit probing to a single CPU core to declutter the output.
 *       (but what if the decryption isn't scheduled to that core?)
 */

/*
 * Adapted from a legacy version of SQLCipher (v3.15.2).
 *
 *     https://github.com/Tencent/sqlcipher/blob/4f37c817eb99e18e4fdc8ac63d67ac33610d66be/src/crypto_impl.c
 */
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
/pid == $target
&& substr(copyinstr(arg0), strlen(copyinstr(arg0)) - 3) == ".db"/
{
    self->path = copyinstr(arg0);
    //printf("\n>>>sqlcipher '%s'\n", self->path);
}

pid$target:WCDB:sqlcipher_cipher_ctx_key_derive:entry
{
    /*
     * Pointers holding userland address
     */
    self->ctx_u = arg0;
    self->c_ctx_u = arg1;
}

pid$target:WCDB:sqlcipher_cipher_ctx_key_derive:return
{
    /*
     * Copy userland memory to kernel, so that we can play with it.
     */
    self->ctx = (codec_ctx *) copyin(self->ctx_u, sizeof(codec_ctx));
    self->c_ctx = (cipher_ctx *) copyin(self->c_ctx_u, sizeof(cipher_ctx));

    /*
     * This gives us the 32-byte raw key followed by the 16-byte salt.
     * The salt is also stored at the first 16 bytes of the respective
     * *.db file, which you can verify with the following command:
     *
     *     xxd -p -l 16 -g 0 '/path/to/foo.db'
     *
     */
    printf("sqlcipher db path: '%s'\n", self->path);
    printf("PRAGMA key = \"%s\"; PRAGMA cipher_compatibility = 3;\n\n",
            copyinstr((user_addr_t) self->c_ctx->keyspec,
                self->c_ctx->keyspec_sz));

    self->ctx_u = 0;
    self->c_ctx_u = 0;
    self->ctx = 0;
    self->c_ctx = 0;
}

