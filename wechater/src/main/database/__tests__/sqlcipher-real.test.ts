import { SqlCipherReader } from '../sqlcipher'

describe('SqlCipherReader', () => {
  let reader: SqlCipherReader

  it('should open a database', async () => {
    console.log('testing open a database')
    reader = new SqlCipherReader()
    const dbPath =
      '/Users/mark/Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat/2.0b4.0.9/1d35a41b3adb8b335cc59362ad55ee88/Message/msg_0.db'
    const key =
      "x'9ab30be49b344171a35c10dc311bb7150005000bdde748c480a805a6ad8c48682eba43dd861d049aabd56b94b510198d'"
    await reader.open(dbPath, key)
    const data = await reader.readDatabase(dbPath, key)
    console.log({ data })
    reader.close()
  })
})
