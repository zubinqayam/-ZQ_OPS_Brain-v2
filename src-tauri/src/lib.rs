use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::State;
use walkdir::WalkDir;

// ─── State ────────────────────────────────────────────────────────────────────

#[derive(Default)]
pub struct AppState {
    pub tasks:      Mutex<Vec<Task>>,
    pub projects:   Mutex<Vec<Project>>,
    pub woods_path: Mutex<String>,
    pub docs:       Mutex<HashMap<String, String>>,
}

// ─── Data Types ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id:         String,
    pub title:      String,
    pub done:       bool,
    pub priority:   String,
    #[serde(rename = "dueDate")]
    pub due_date:   String,
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id:       String,
    pub name:     String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    pub color:    String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct INNMStatus {
    pub front:      String,
    pub back:       String,
    pub up:         String,
    #[serde(rename = "woodsPath")]
    pub woods_path: String,
    #[serde(rename = "docCount")]
    pub doc_count:  usize,
}

// ─── Commands: Tasks ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_tasks(state: State<AppState>) -> Vec<Task> {
    state.tasks.lock().unwrap().clone()
}

#[tauri::command]
pub fn create_task(
    title:      String,
    priority:   String,
    due_date:   String,
    project_id: String,
    state:      State<AppState>,
) -> Task {
    let task = Task {
        id:         uuid_v4(),
        title,
        done:       false,
        priority,
        due_date,
        project_id: if project_id.is_empty() { None } else { Some(project_id) },
        created_at: chrono_now(),
    };
    state.tasks.lock().unwrap().push(task.clone());
    task
}

#[tauri::command]
pub fn update_task_done(id: String, done: bool, state: State<AppState>) -> bool {
    let mut tasks = state.tasks.lock().unwrap();
    if let Some(t) = tasks.iter_mut().find(|t| t.id == id) {
        t.done = done;
        return true;
    }
    false
}

#[tauri::command]
pub fn delete_task(id: String, state: State<AppState>) -> bool {
    let mut tasks = state.tasks.lock().unwrap();
    let before = tasks.len();
    tasks.retain(|t| t.id != id);
    tasks.len() < before
}

// ─── Commands: Projects ───────────────────────────────────────────────────────

#[tauri::command]
pub fn get_projects(state: State<AppState>) -> Vec<Project> {
    state.projects.lock().unwrap().clone()
}

#[tauri::command]
pub fn create_project(
    name:      String,
    parent_id: String,
    color:     String,
    state:     State<AppState>,
) -> Project {
    let project = Project {
        id:        uuid_v4(),
        name,
        parent_id: if parent_id.is_empty() { None } else { Some(parent_id) },
        color,
    };
    state.projects.lock().unwrap().push(project.clone());
    project
}

#[tauri::command]
pub fn delete_project(id: String, state: State<AppState>) -> bool {
    let mut projects = state.projects.lock().unwrap();
    let before = projects.len();
    projects.retain(|p| p.id != id);
    projects.len() < before
}

// ─── Commands: INNM-WOSDS ────────────────────────────────────────────────────

/// Map a WOODS folder: walk for .txt / .md / .csv / .log files and index them.
#[tauri::command]
pub fn map_woods_folder(folder_path: String, state: State<AppState>) -> String {
    let supported = [".txt", ".md", ".csv", ".log"];
    let mut docs: HashMap<String, String> = HashMap::new();
    let mut indexed = 0usize;
    let mut errors = 0usize;

    for entry in WalkDir::new(&folder_path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_lowercase()))
            .unwrap_or_default();

        if supported.contains(&ext.as_str()) {
            match std::fs::read_to_string(path) {
                Ok(content) => {
                    docs.insert(path.to_string_lossy().to_string(), content);
                    indexed += 1;
                }
                Err(_) => {
                    errors += 1;
                }
            }
        }
    }

    *state.woods_path.lock().unwrap() = folder_path.clone();
    *state.docs.lock().unwrap() = docs;

    format!(
        "WOODS mapping complete.\nFolder:  {}\nIndexed: {} files\nErrors:  {}\nEngine:  INNM FRONT/BACK/UP ready.",
        folder_path, indexed, errors
    )
}

/// Get current INNM / WOODS status.
#[tauri::command]
pub fn get_woods_status(state: State<AppState>) -> INNMStatus {
    let woods_path = state.woods_path.lock().unwrap().clone();
    let doc_count  = state.docs.lock().unwrap().len();
    let active     = if doc_count > 0 { "active" } else { "idle" };

    INNMStatus {
        front:      active.to_string(),
        back:       active.to_string(),
        up:         active.to_string(),
        woods_path,
        doc_count,
    }
}

/// Send a message through the INNM Triangular Matrix Engine.
///
/// FRONT  – tokenise & match query against indexed docs
/// BACK   – validate context relevance score
/// UP     – synthesise final response
#[tauri::command]
pub fn send_innm_message(message: String, state: State<AppState>) -> String {
    let docs      = state.docs.lock().unwrap();
    let woods_path = state.woods_path.lock().unwrap().clone();

    if docs.is_empty() {
        return format!(
            "[INNM] No WOODS folder mapped yet.\n\
             Go to the INNM tab → map a folder first.\n\
             Query: \"{}\"",
            message
        );
    }

    // FRONT: simple keyword search across indexed documents
    let query_lower = message.to_lowercase();
    let query_words: Vec<&str> = query_lower.split_whitespace().collect();

    let mut matches: Vec<(String, usize, String)> = docs
        .iter()
        .filter_map(|(path, content)| {
            let content_lower = content.to_lowercase();
            let score = query_words
                .iter()
                .filter(|w| content_lower.contains(*w))
                .count();
            if score > 0 {
                // Extract a short snippet around the first match
                let snippet = extract_snippet(content, &query_words, 200);
                Some((path.clone(), score, snippet))
            } else {
                None
            }
        })
        .collect();

    // BACK: sort by relevance score descending
    matches.sort_by(|a, b| b.1.cmp(&a.1));

    // UP: synthesise response
    if matches.is_empty() {
        return format!(
            "[INNM] No matching documents found in WOODS folder.\n\
             Folder: {}\nDocs indexed: {}\nQuery: \"{}\"",
            woods_path,
            docs.len(),
            message
        );
    }

    let top = matches.iter().take(3);
    let mut response = format!(
        "[INNM] Found {} matching document(s) for: \"{}\"\n\
         WOODS: {}\n\n",
        matches.len(),
        message,
        woods_path
    );

    for (i, (path, score, snippet)) in top.enumerate() {
        let filename = std::path::Path::new(path)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or(path);
        response.push_str(&format!(
            "─── Match {} (score: {}) ───\n📄 {}\n{}\n\n",
            i + 1,
            score,
            filename,
            snippet
        ));
    }

    response
}

// ─── Commands: Utilities ──────────────────────────────────────────────────────

/// Open native folder picker (via tauri-plugin-dialog).
/// Returns the selected path or an empty string if cancelled.
#[tauri::command]
pub async fn select_folder_dialog(app: tauri::AppHandle) -> String {
    use tauri_plugin_dialog::DialogExt;
    app.dialog()
        .file()
        .pick_folder()
        .blocking_pick()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn uuid_v4() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.gen();
    format!(
        "{:08x}-{:04x}-{:04x}-{:04x}-{:012x}",
        u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]),
        u16::from_be_bytes([bytes[4], bytes[5]]),
        (u16::from_be_bytes([bytes[6], bytes[7]]) & 0x0fff) | 0x4000,
        (u16::from_be_bytes([bytes[8], bytes[9]]) & 0x3fff) | 0x8000,
        u64::from_be_bytes([0, 0, bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]])
    )
}

fn chrono_now() -> String {
    // Simple ISO-8601 timestamp without external time crate
    // Using SystemTime for lightweight zero-dep solution
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Approximate: good enough for task timestamps
    format!("{}Z", secs)
}

fn extract_snippet(content: &str, query_words: &[&str], max_len: usize) -> String {
    let lower = content.to_lowercase();
    // Find first occurrence of any query word
    let pos = query_words
        .iter()
        .filter_map(|w| lower.find(w))
        .min()
        .unwrap_or(0);

    let start = pos.saturating_sub(80);
    let end    = (pos + max_len).min(content.len());

    let raw: String = content
        .chars()
        .skip(start)
        .take(end - start)
        .collect();

    // Strip to valid char boundary (just in case)
    let trimmed = raw.trim();
    if start > 0 {
        format!("…{}", trimmed)
    } else {
        trimmed.to_string()
    }
}

// ─── App Entry ────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            create_task,
            update_task_done,
            delete_task,
            get_projects,
            create_project,
            delete_project,
            map_woods_folder,
            get_woods_status,
            send_innm_message,
            select_folder_dialog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ZQ Ops Brain");
}
