use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub id: String,
    pub path: String,
    pub key: String,
    pub cipher_compatibility: i32,
    pub db_type: String,
    pub filename: String,
    pub size: Option<u64>,
    pub accessible: bool,
    pub last_modified: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
    pub row_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub type_name: String,
    pub nullable: bool,
    pub primary_key: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: i64,
}

#[derive(Debug, Error)]
pub enum DatabaseError {
    #[error("Database connection error: {0}")]
    Connection(#[from] rusqlite::Error),
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    #[error("Invalid key format: {0}")]
    InvalidKey(String),
    #[error("Database not found: {0}")]
    NotFound(String),
    #[error("Access denied: {0}")]
    AccessDenied(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Parse error: {0}")]
    Parse(String),
}

pub type DatabaseResult<T> = Result<T, DatabaseError>;

pub struct DatabaseManager {
    databases: HashMap<String, DatabaseInfo>,
    connections: HashMap<String, Connection>,
}

impl DatabaseManager {
    pub fn new() -> Self {
        Self {
            databases: HashMap::new(),
            connections: HashMap::new(),
        }
    }

    pub fn parse_keys_file<P: AsRef<Path>>(path: P) -> DatabaseResult<Vec<DatabaseInfo>> {
        let content = std::fs::read_to_string(path)?;
        Self::parse_keys_content(&content)
    }

    pub fn parse_keys_content(content: &str) -> DatabaseResult<Vec<DatabaseInfo>> {
        let mut databases = Vec::new();
        let lines: Vec<&str> = content.lines().collect();
        
        let mut current_path = String::new();
        
        for line in lines {
            let line = line.trim();
            
            if line.starts_with("sqlcipher db path:") {
                if let Some(start) = line.find("'") {
                    if let Some(end) = line.rfind("'") {
                        current_path = line[start + 1..end].to_string();
                    }
                }
            } else if line.starts_with("PRAGMA key =") && !current_path.is_empty() {
                if let Some(start) = line.find("\"") {
                    if let Some(end) = line.rfind("\"") {
                        let key = line[start + 1..end].to_string();
                        
                        let db_info = Self::create_database_info(&current_path, &key)?;
                        databases.push(db_info);
                        
                        current_path.clear();
                    }
                }
            }
        }
        
        // Deduplicate databases based on path
        let mut seen_paths = std::collections::HashSet::new();
        let unique_databases: Vec<DatabaseInfo> = databases
            .into_iter()
            .filter(|db| seen_paths.insert(db.path.clone()))
            .collect();
        
        Ok(unique_databases)
    }

    fn create_database_info(path: &str, key: &str) -> DatabaseResult<DatabaseInfo> {
        let path_obj = Path::new(path);
        let filename = path_obj.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        let db_type = Self::extract_db_type(path);
        let id = Self::generate_id(path, key);
        
        let size = std::fs::metadata(path).ok().map(|m| m.len());
        let last_modified = std::fs::metadata(path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .ok()
                    .map(|d| d.as_secs())
            })
            .map(|timestamp| timestamp.to_string());
        
        Ok(DatabaseInfo {
            id,
            path: path.to_string(),
            key: key.to_string(),
            cipher_compatibility: 3,
            db_type,
            filename,
            size,
            accessible: Path::new(path).exists(),
            last_modified,
        })
    }

    fn extract_db_type(path: &str) -> String {
        let path_parts: Vec<&str> = path.split('/').collect();
        
        for i in (0..path_parts.len()).rev() {
            if path_parts[i].ends_with(".db") && i > 0 {
                return path_parts[i - 1].to_string();
            }
        }
        
        "unknown".to_string()
    }

    fn generate_id(path: &str, key: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        
        // Hash the full path to ensure uniqueness
        path.hash(&mut hasher);
        
        // Hash the key to ensure uniqueness for same path with different keys
        key.hash(&mut hasher);
        
        // Also hash the file size and metadata for better uniqueness
        if let Ok(metadata) = std::fs::metadata(path) {
            metadata.len().hash(&mut hasher);
            if let Ok(modified) = metadata.modified() {
                modified.hash(&mut hasher);
            }
        }
        
        format!("{:x}", hasher.finish())
    }

    pub fn load_databases(&mut self, databases: Vec<DatabaseInfo>) {
        // Clear existing databases first
        self.databases.clear();
        
        for db in databases {
            // Insert database, this will automatically replace any duplicate IDs
            self.databases.insert(db.id.clone(), db);
        }
    }

    pub fn get_databases(&self) -> Vec<DatabaseInfo> {
        self.databases.values().cloned().collect()
    }

    pub fn get_database(&self, id: &str) -> Option<&DatabaseInfo> {
        self.databases.get(id)
    }

    pub fn connect_database(&mut self, id: &str) -> DatabaseResult<()> {
        let db_info = self.databases.get(id)
            .ok_or_else(|| DatabaseError::NotFound(id.to_string()))?;
        
        if !db_info.accessible {
            return Err(DatabaseError::AccessDenied(format!("Database {} is not accessible", id)));
        }

        let conn = Connection::open(&db_info.path)
            .map_err(|e| DatabaseError::ConnectionFailed(format!("Failed to open database file: {}", e)))?;
        
        // Helper function to execute PRAGMA with fallback for rusqlite quirks
        let execute_pragma = |pragma: &str| -> Result<(), DatabaseError> {
            match conn.execute(pragma, []) {
                Ok(_) => Ok(()),
                Err(rusqlite::Error::ExecuteReturnedResults) => {
                    // Some PRAGMA statements might return results, consume them
                    let mut stmt = conn.prepare(pragma)
                        .map_err(|e| DatabaseError::ConnectionFailed(format!("Failed to prepare pragma: {}", e)))?;
                    let mut rows = stmt.query([])
                        .map_err(|e| DatabaseError::ConnectionFailed(format!("Failed to query pragma: {}", e)))?;
                    while let Some(_) = rows.next()
                        .map_err(|e| DatabaseError::ConnectionFailed(format!("Failed to read pragma results: {}", e)))? {
                        // Consume any results
                    }
                    Ok(())
                }
                Err(e) => Err(DatabaseError::ConnectionFailed(format!("Failed to execute pragma: {}", e))),
            }
        };
        
        // Set SQLCipher compatibility mode first (for SQLCipher3)
        execute_pragma("PRAGMA cipher_compatibility = 3")?;
        
        // Set SQLCipher key - use the key as-is from the .keys file (already in x'...' format)
        execute_pragma(&format!("PRAGMA key = \"{}\"", db_info.key))?;
        
        // Set additional SQLCipher3 parameters for compatibility
        execute_pragma("PRAGMA cipher_page_size = 1024")?;
        execute_pragma("PRAGMA kdf_iter = 64000")?;
        execute_pragma("PRAGMA cipher_hmac_algorithm = HMAC_SHA1")?;
        execute_pragma("PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA1")?;
        
        // Test connection by querying sqlite_master
        {
            let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1")
                .map_err(|e| DatabaseError::ConnectionFailed(format!("Failed to prepare test query: {}", e)))?;
            let _: Vec<String> = stmt.query_map([], |row| {
                Ok(row.get::<_, String>(0)?)
            })?.collect::<Result<Vec<_>, _>>()
                .map_err(|e| DatabaseError::ConnectionFailed(format!("Failed to execute test query: {}", e)))?;
        }
        
        self.connections.insert(id.to_string(), conn);
        Ok(())
    }

    pub fn get_tables(&self, db_id: &str) -> DatabaseResult<Vec<TableInfo>> {
        let conn = self.connections.get(db_id)
            .ok_or_else(|| DatabaseError::NotFound(format!("Connection for database {} not found", db_id)))?;
        
        let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")?;
        let table_names: Vec<String> = stmt.query_map([], |row| {
            Ok(row.get::<_, String>(0)?)
        })?.collect::<Result<Vec<_>, _>>()?;
        
        let mut tables = Vec::new();
        for table_name in table_names {
            let columns = self.get_table_columns(conn, &table_name)?;
            let row_count = self.get_table_row_count(conn, &table_name)?;
            
            tables.push(TableInfo {
                name: table_name,
                columns,
                row_count: Some(row_count),
            });
        }
        
        Ok(tables)
    }

    fn get_table_columns(&self, conn: &Connection, table_name: &str) -> DatabaseResult<Vec<ColumnInfo>> {
        let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
        let columns: Vec<ColumnInfo> = stmt.query_map([], |row| {
            Ok(ColumnInfo {
                name: row.get::<_, String>(1)?,
                type_name: row.get::<_, String>(2)?,
                nullable: row.get::<_, i32>(3)? == 0,
                primary_key: row.get::<_, i32>(5)? == 1,
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        
        Ok(columns)
    }

    fn get_table_row_count(&self, conn: &Connection, table_name: &str) -> DatabaseResult<i64> {
        let mut stmt = conn.prepare(&format!("SELECT COUNT(*) FROM {}", table_name))?;
        let count: i64 = stmt.query_row([], |row| row.get(0))?;
        Ok(count)
    }

    pub fn query_table(&self, db_id: &str, table_name: &str, limit: Option<i64>, offset: Option<i64>) -> DatabaseResult<QueryResult> {
        let conn = self.connections.get(db_id)
            .ok_or_else(|| DatabaseError::NotFound(format!("Connection for database {} not found", db_id)))?;
        
        let limit_clause = limit.map(|l| format!(" LIMIT {}", l)).unwrap_or_default();
        let offset_clause = offset.map(|o| format!(" OFFSET {}", o)).unwrap_or_default();
        
        let query = format!("SELECT * FROM {}{}{}", table_name, limit_clause, offset_clause);
        let mut stmt = conn.prepare(&query)?;
        
        let column_count = stmt.column_count();
        let mut columns = Vec::new();
        for i in 0..column_count {
            columns.push(stmt.column_name(i)?.to_string());
        }
        
        let rows: Vec<Vec<serde_json::Value>> = stmt.query_map([], |row| {
            let mut values = Vec::new();
            for i in 0..column_count {
                let value = match row.get::<_, Option<String>>(i) {
                    Ok(Some(s)) => serde_json::Value::String(s),
                    Ok(None) => serde_json::Value::Null,
                    Err(_) => {
                        // Try other types
                        if let Ok(n) = row.get::<_, i64>(i) {
                            serde_json::Value::Number(n.into())
                        } else if let Ok(f) = row.get::<_, f64>(i) {
                            serde_json::Value::Number(serde_json::Number::from_f64(f).unwrap_or(serde_json::Number::from(0)))
                        } else {
                            serde_json::Value::Null
                        }
                    }
                };
                values.push(value);
            }
            Ok(values)
        })?.collect::<Result<Vec<_>, _>>()?;
        
        let total_rows = self.get_table_row_count(conn, table_name)?;
        
        Ok(QueryResult {
            columns,
            rows,
            total_rows,
        })
    }

    pub fn execute_query(&self, db_id: &str, query: &str) -> DatabaseResult<QueryResult> {
        let conn = self.connections.get(db_id)
            .ok_or_else(|| DatabaseError::NotFound(format!("Connection for database {} not found", db_id)))?;
        
        let mut stmt = conn.prepare(query)?;
        
        let column_count = stmt.column_count();
        let mut columns = Vec::new();
        for i in 0..column_count {
            columns.push(stmt.column_name(i)?.to_string());
        }
        
        let rows: Vec<Vec<serde_json::Value>> = stmt.query_map([], |row| {
            let mut values = Vec::new();
            for i in 0..column_count {
                let value = match row.get::<_, Option<String>>(i) {
                    Ok(Some(s)) => serde_json::Value::String(s),
                    Ok(None) => serde_json::Value::Null,
                    Err(_) => {
                        if let Ok(n) = row.get::<_, i64>(i) {
                            serde_json::Value::Number(n.into())
                        } else if let Ok(f) = row.get::<_, f64>(i) {
                            serde_json::Value::Number(serde_json::Number::from_f64(f).unwrap_or(serde_json::Number::from(0)))
                        } else {
                            serde_json::Value::Null
                        }
                    }
                };
                values.push(value);
            }
            Ok(values)
        })?.collect::<Result<Vec<_>, _>>()?;
        
        let total_rows = rows.len() as i64;
        
        Ok(QueryResult {
            columns,
            rows,
            total_rows,
        })
    }

    pub fn disconnect_database(&mut self, id: &str) -> DatabaseResult<()> {
        self.connections.remove(id);
        Ok(())
    }

    pub fn disconnect_all(&mut self) {
        self.connections.clear();
    }
}