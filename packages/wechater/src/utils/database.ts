import fs from 'fs';
import toml from 'toml';

export interface DatabaseInfo {
  path: string;
  key: string;
  cipher_compatibility: number;
  type: string;
}

export interface DatabaseConfig {
  metadata: {
    version: string;
    generated_at: string;
  };
  databases: Record<string, DatabaseInfo[]>;
}

export function loadDatabaseConfig(configPath: string): DatabaseConfig {
  const content = fs.readFileSync(configPath, 'utf-8');
  return toml.parse(content) as DatabaseConfig;
}
