import { SqlCipherReader } from '../sqlcipher'
import path from 'path'
import fs from 'fs/promises'
import Database from 'better-sqlite3'

describe('SqlCipherReader', () => {
  let reader: SqlCipherReader
  let testDbPath: string

  beforeAll(async () => {
    reader = new SqlCipherReader()
    testDbPath = path.join(process.cwd(), 'temp', 'test.db')

    // Create a test database
    const db = new Database(testDbPath)
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)')
    db.prepare('INSERT INTO test (name) VALUES (?)').run('test1')
    db.prepare('INSERT INTO test (name) VALUES (?)').run('test2')
    db.close()
  })

  afterAll(async () => {
    try {
      await fs.unlink(testDbPath)
    } catch (error) {
      console.error('Error cleaning up test database:', error)
    }
  })

  it('should read an unencrypted database', async () => {
    const result = await reader.readDatabase(testDbPath)
    expect(result).toBeDefined()
    expect(result.test).toBeDefined()
    expect(result.test.columns).toEqual(['id', 'name'])
    expect(result.test.rows.length).toBe(2)
  })

  it('should validate a valid database', async () => {
    const isValid = await reader.validateDatabase(testDbPath)
    expect(isValid).toBe(true)
  })

  it('should reject an invalid database path', async () => {
    const isValid = await reader.validateDatabase('invalid/path/to/db')
    expect(isValid).toBe(false)
  })

  it('should handle invalid key gracefully', async () => {
    const isValid = await reader.validateDatabase(testDbPath, 'invalid-key')
    expect(isValid).toBe(false)
  })

  it('should query table with pagination', async () => {
    await reader.open(testDbPath)
    const result = await reader.queryTable('test', { limit: 1, offset: 1 })
    expect(result.rows.length).toBe(1)
    expect(result.rows[0][1]).toBe('test2')
    reader.close()
  })

  it('should get table info', async () => {
    await reader.open(testDbPath)
    const query = await reader.queryTable('test', 'SELECT * FROM test')
    expect(query.columns).toContain('name')
    reader.close()
  })
})
