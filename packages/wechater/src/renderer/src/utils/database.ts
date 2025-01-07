import toml from 'toml'

export interface DatabaseInfo {
  path: string
  key: string
  cipher_compatibility: number
  type: string
}

export interface DatabaseConfig {
  metadata: {
    version: string
    generated_at: string
  }
  databases: Record<string, DatabaseInfo[]>
}

export async function loadDatabaseConfig(): Promise<DatabaseConfig> {
  try {
    // 首先尝试使用 window.api
    if (window.api?.readKeysToml) {
      const content = await window.api.readKeysToml()
      return toml.parse(content) as DatabaseConfig
    }

    throw new Error('No available IPC method found')
  } catch (error) {
    console.error('Failed to load database config:', error)
    throw error
  }
}
