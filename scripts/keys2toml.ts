import fs from 'fs'
import path from 'path'
import TOML from '@iarna/toml'

interface DbKey {
  path: string
  key: string
  cipher_compatibility: number
  type: string
}

function extractDbType(filepath: string): string {
  const parts = filepath.split('/')
  // Get the last directory name before the db file
  for (let i = parts.length - 2; i >= 0; i--) {
    if (parts[i] !== '') {
      return parts[i]
    }
  }
  return 'unknown'
}

function parseKeys(content: string): DbKey[] {
  const keys: DbKey[] = []
  const lines = content.split('\n')
  
  let currentPath = ''
  let currentKey = ''
  
  for (const line of lines) {
    const pathMatch = line.match(/sqlcipher db path: '([^']+)'/)
    const keyMatch = line.match(/PRAGMA key = "([^"]+)"/)
    
    if (pathMatch) {
      currentPath = pathMatch[1]
    }
    
    if (keyMatch && currentPath) {
      keys.push({
        path: currentPath,
        key: keyMatch[1],
        cipher_compatibility: 3, // From the original file
        type: extractDbType(currentPath)
      })
      currentPath = ''
    }
  }
  
  return keys
}

function groupByType(keys: DbKey[]): Record<string, DbKey[]> {
  const grouped: Record<string, DbKey[]> = {}
  
  for (const key of keys) {
    if (!grouped[key.type]) {
      grouped[key.type] = []
    }
    grouped[key.type].push(key)
  }
  
  return grouped
}

function convertToToml(keys: Record<string, DbKey[]>): string {
  const tomlObj: any = {
    metadata: {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
    },
    databases: keys
  }
  
  return TOML.stringify(tomlObj)
}

// Main execution
async function main() {
  try {
    const inputPath = path.join(process.cwd(), '.keys')
    const outputPath = path.join(process.cwd(), '.keys.toml')
    
    const content = await fs.promises.readFile(inputPath, 'utf-8')
    const keys = parseKeys(content)
    const groupedKeys = groupByType(keys)
    const tomlContent = convertToToml(groupedKeys)
    
    await fs.promises.writeFile(outputPath, tomlContent)
    console.log('Successfully converted keys to TOML format')
    
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
