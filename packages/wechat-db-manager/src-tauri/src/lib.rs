mod database;

use database::{
    DatabaseManager, DatabaseInfo, TableInfo, QueryResult
};
use std::sync::Mutex;
use tauri::State;

type DbManager = Mutex<DatabaseManager>;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn load_keys_file(path: String, manager: State<DbManager>) -> Result<Vec<DatabaseInfo>, String> {
    let databases = DatabaseManager::parse_keys_file(&path)
        .map_err(|e| format!("Failed to parse keys file: {}", e))?;
    
    let mut mgr = manager.lock().unwrap();
    mgr.load_databases(databases.clone());
    
    Ok(databases)
}

#[tauri::command]
fn get_databases(manager: State<DbManager>) -> Result<Vec<DatabaseInfo>, String> {
    let mgr = manager.lock().unwrap();
    Ok(mgr.get_databases())
}

#[tauri::command]
fn connect_database(db_id: String, manager: State<DbManager>) -> Result<(), String> {
    let mut mgr = manager.lock().unwrap();
    mgr.connect_database(&db_id)
        .map_err(|e| format!("Failed to connect to database: {}", e))
}

#[tauri::command]
fn get_tables(db_id: String, manager: State<DbManager>) -> Result<Vec<TableInfo>, String> {
    let mgr = manager.lock().unwrap();
    mgr.get_tables(&db_id)
        .map_err(|e| format!("Failed to get tables: {}", e))
}

#[tauri::command]
fn query_table(
    db_id: String,
    table_name: String,
    limit: Option<i64>,
    offset: Option<i64>,
    manager: State<DbManager>
) -> Result<QueryResult, String> {
    let mgr = manager.lock().unwrap();
    mgr.query_table(&db_id, &table_name, limit, offset)
        .map_err(|e| format!("Failed to query table: {}", e))
}

#[tauri::command]
fn execute_query(
    db_id: String,
    query: String,
    manager: State<DbManager>
) -> Result<QueryResult, String> {
    let mgr = manager.lock().unwrap();
    mgr.execute_query(&db_id, &query)
        .map_err(|e| format!("Failed to execute query: {}", e))
}

#[tauri::command]
fn disconnect_database(db_id: String, manager: State<DbManager>) -> Result<(), String> {
    let mut mgr = manager.lock().unwrap();
    mgr.disconnect_database(&db_id)
        .map_err(|e| format!("Failed to disconnect database: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(DbManager::new(DatabaseManager::new()))
        .invoke_handler(tauri::generate_handler![
            greet,
            load_keys_file,
            get_databases,
            connect_database,
            get_tables,
            query_table,
            execute_query,
            disconnect_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
