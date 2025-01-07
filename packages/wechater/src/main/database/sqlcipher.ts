import type { Database as DatabaseType } from 'better-sqlite3-multiple-ciphers'
import Database from 'better-sqlite3-multiple-ciphers'
import { app } from 'electron'
import path from 'path'

export interface TableSchema {
  columns: string[]
  rows: any[][]
}

export interface DatabaseSchema {
  [tableName: string]: TableSchema
}

export class SqlCipherReader {
  private db: DatabaseType | null = null

  async open(dbPath: string, key?: string): Promise<void> {
    try {
      // dbPath = dbPath.replace('.db', '')
      console.log('opening database: %s', dbPath)
      this.db = new Database(dbPath, {
        verbose: console.log // nativeBinding: binaryPath
      })

      if (key) {
        // WeChat SQLCipher configuration
        this.db.pragma(`cipher='sqlcipher'`)
        this.db.pragma(`legacy=3`)
        this.db.pragma(`key = "${key}"`)
      }

      // Test connection
      this.db.prepare('SELECT 1').get()
    } catch (error) {
      this.close()
      throw new Error(
        `Failed to open database: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  close(): void {
    if (this.db) {
      try {
        this.db.close()
      } catch (error) {
        console.error('Error closing database:', error)
      } finally {
        this.db = null
      }
    }
  }

  async readDatabase(dbPath: string, key?: string): Promise<DatabaseSchema> {
    try {
      await this.open(dbPath, key)

      if (!this.db) {
        throw new Error('Database not opened')
      }

      // Get all tables
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string
      }[]

      const result: DatabaseSchema = {}

      for (const { name: tableName } of tables) {
        try {
          // Get column information
          const stmt = this.db.prepare(`SELECT * FROM ${tableName} LIMIT 1`)
          const columnInfo = stmt.columns()
          const columns = columnInfo.map((col) => col.name)

          // Get rows
          const rows = this.db.prepare(`SELECT * FROM ${tableName} LIMIT 5`).all()

          result[tableName] = {
            columns,
            rows: rows.map((row: any) => columns.map((col) => row[col]))
          }
        } catch (error) {
          console.error(`Error reading table ${tableName}:`, error)
        }
      }

      return result
    } finally {
      this.close()
    }
  }

  async validateDatabase(dbPath: string, key?: string): Promise<boolean> {
    try {
      await this.open(dbPath, key)
      return true
    } catch {
      return false
    } finally {
      this.close()
    }
  }

  async getTables(): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not opened')
    }

    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string
    }[]

    return tables.map((t) => t.name)
  }

  async queryTable(
    tableName: string,
    query:
      | string
      | {
          limit?: number
          offset?: number
          where?: string
          orderBy?: string
        }
  ): Promise<TableSchema> {
    if (!this.db) {
      throw new Error('Database not opened')
    }

    let sqlQuery: string
    if (typeof query === 'string') {
      sqlQuery = query
    } else {
      sqlQuery = `SELECT * FROM ${tableName}`
      if (query.where) {
        sqlQuery += ` WHERE ${query.where}`
      }
      if (query.orderBy) {
        sqlQuery += ` ORDER BY ${query.orderBy}`
      }
      if (query.limit) {
        sqlQuery += ` LIMIT ${query.limit}`
      }
      if (query.offset) {
        sqlQuery += ` OFFSET ${query.offset}`
      }
    }

    const stmt = this.db.prepare(sqlQuery)
    const columnInfo = stmt.columns()
    const columns = columnInfo.map((col) => col.name)
    const rows = stmt.all()

    return {
      columns,
      rows: rows.map((row: any) => columns.map((col) => row[col]))
    }
  }

  private getTableInfo(tableName: string) {
    if (!this.db) {
      throw new Error('Database not opened')
    }
    return this.db.prepare(`PRAGMA table_info(${tableName})`).all()
  }

  private getLibraryPath(): string {
    // 在测试环境中，直接返回空字符串
    if (process.env.NODE_ENV === 'test') {
      return ''
    }
    // 其他环境的逻辑...
    return app.isPackaged
      ? path.join(process.resourcesPath, 'better-sqlite3/better_sqlite3.node')
      : ''
  }
}
