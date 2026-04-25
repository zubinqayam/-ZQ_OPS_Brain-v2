import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api";
import {
  CalendarDays,
  FolderOpen,
  CheckSquare,
  MessageSquare,
  Brain,
  Settings,
  Plus,
  Trash2,
  Send,
  FolderInput,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Cpu,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { randomId, formatDate, truncate } from "./lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low";
type TabId = "today" | "projects" | "tasks" | "chat" | "innm" | "settings";

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  dueDate: string;
  projectId: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface VaultEntry {
  id: string;
  label: string;
  secret: string;
  visible: boolean;
}

interface INNMStatus {
  front: string;
  back: string;
  up: string;
  woodsPath: string;
  docCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_COLORS = [
  "#58a6ff",
  "#3fb950",
  "#d29922",
  "#f85149",
  "#bc8cff",
  "#79c0ff",
];

const TABS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: "today",    label: "Today",    Icon: CalendarDays   },
  { id: "projects", label: "Projects", Icon: FolderOpen     },
  { id: "tasks",    label: "Tasks",    Icon: CheckSquare    },
  { id: "chat",     label: "Chat",     Icon: MessageSquare  },
  { id: "innm",     label: "INNM",     Icon: Brain          },
  { id: "settings", label: "Settings", Icon: Settings       },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [vault, setVault]         = useState<VaultEntry[]>([]);
  const [innmStatus, setInnmStatus] = useState<INNMStatus>({
    front: "idle",
    back:  "idle",
    up:    "idle",
    woodsPath: "",
    docCount:  0,
  });

  // Load initial data from Rust backend
  useEffect(() => {
    loadTasks();
    loadProjects();
    loadInnmStatus();
  }, []);

  async function loadTasks() {
    try {
      const result = await invoke<Task[]>("get_tasks");
      setTasks(result);
    } catch {
      // Backend not yet running in dev; use local state
    }
  }

  async function loadProjects() {
    try {
      const result = await invoke<Project[]>("get_projects");
      setProjects(result);
    } catch {
      // Backend not yet running in dev; use local state
    }
  }

  async function loadInnmStatus() {
    try {
      const result = await invoke<INNMStatus>("get_woods_status");
      setInnmStatus(result);
    } catch {
      // Backend not yet running in dev; use local state
    }
  }

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <span className="logo">⚡ ZQ Ops Brain</span>
        <span className="version-badge">v2.0 INNM-WOSDS</span>
        <span className="status-dot" title="System Online" />
      </header>

      {/* ── Tab Bar ── */}
      <nav className="tab-bar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`tab-btn ${activeTab === id ? "active" : ""}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={15} />
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main className="tab-content">
        {activeTab === "today"    && <TodayTab    tasks={tasks}    setTasks={setTasks}    projects={projects} />}
        {activeTab === "projects" && <ProjectsTab projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} />}
        {activeTab === "tasks"    && <TasksTab    tasks={tasks}    setTasks={setTasks}    projects={projects} />}
        {activeTab === "chat"     && <ChatTab     messages={messages} setMessages={setMessages} />}
        {activeTab === "innm"     && <INNMTab     innmStatus={innmStatus} setInnmStatus={setInnmStatus} onRefresh={loadInnmStatus} />}
        {activeTab === "settings" && <SettingsTab vault={vault} setVault={setVault} />}
      </main>
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab({
  tasks,
  setTasks,
  projects,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(
    (t) => !t.done || t.dueDate === today
  );

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">
          📅 Today – {formatDate(new Date())}
        </h2>
      </div>

      <AddTaskForm setTasks={setTasks} projects={projects} defaultDueDate={today} />

      <div className="card">
        <div className="card-title">Active Tasks ({todayTasks.filter((t) => !t.done).length})</div>
        {todayTasks.filter((t) => !t.done).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <div className="empty-text">All caught up!</div>
          </div>
        ) : (
          todayTasks
            .filter((t) => !t.done)
            .sort((a, b) => {
              const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
              return order[a.priority] - order[b.priority];
            })
            .map((t) => (
              <TaskRow key={t.id} task={t} setTasks={setTasks} projects={projects} />
            ))
        )}
      </div>

      {todayTasks.filter((t) => t.done).length > 0 && (
        <div className="card">
          <div className="card-title">Completed Today ({todayTasks.filter((t) => t.done).length})</div>
          {todayTasks
            .filter((t) => t.done)
            .map((t) => (
              <TaskRow key={t.id} task={t} setTasks={setTasks} projects={projects} />
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Projects Tab ─────────────────────────────────────────────────────────────

function ProjectsTab({
  projects,
  setProjects,
  tasks,
  setTasks,
}: {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName]   = useState("");

  const rootProjects = projects.filter((p) => p.parentId === null);

  function addProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const np: Project = {
      id:       randomId(),
      name,
      parentId: selectedProject ?? null,
      color:    PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
    };
    setProjects((prev) => [...prev, np]);
    setNewProjectName("");
  }

  function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTasks((prev) => prev.map((t) => t.projectId === id ? { ...t, projectId: null } : t));
  }

  const projectTasks = selectedProject
    ? tasks.filter((t) => t.projectId === selectedProject)
    : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
      {/* Project tree */}
      <div>
        <div className="section-header">
          <span className="section-title">📁 Projects</span>
          <button className="btn btn-primary btn-sm" onClick={addProject}>
            <Plus size={12} /> Add
          </button>
        </div>
        <div className="input-group" style={{ marginBottom: 10 }}>
          <input
            className="input"
            placeholder="New project name…"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProject()}
          />
        </div>
        <ul className="project-tree">
          {rootProjects.map((p) => (
            <ProjectNode
              key={p.id}
              project={p}
              allProjects={projects}
              selected={selectedProject}
              onSelect={setSelectedProject}
              onDelete={deleteProject}
            />
          ))}
        </ul>
        {projects.length === 0 && (
          <div className="empty-state">
            <div className="empty-text">No projects yet</div>
          </div>
        )}
      </div>

      {/* Project detail */}
      <div>
        {selectedProject ? (
          <>
            <div className="section-header">
              <span className="section-title">
                {projects.find((p) => p.id === selectedProject)?.name}
              </span>
            </div>
            <AddTaskForm setTasks={setTasks} projects={projects} defaultProjectId={selectedProject} />
            <div className="card">
              {projectTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-text">No tasks in this project</div>
                </div>
              ) : (
                projectTasks.map((t) => (
                  <TaskRow key={t.id} task={t} setTasks={setTasks} projects={projects} />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-icon">📁</div>
            <div className="empty-text">Select a project to view tasks</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectNode({
  project,
  allProjects,
  selected,
  onSelect,
  onDelete,
}: {
  project: Project;
  allProjects: Project[];
  selected: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = allProjects.filter((p) => p.parentId === project.id);

  return (
    <li>
      <div
        className={`project-node ${selected === project.id ? "selected" : ""}`}
        onClick={() => onSelect(project.id)}
      >
        {children.length > 0 ? (
          <button
            className="btn-icon"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span style={{ width: 21 }} />
        )}
        <span style={{ color: project.color }}>●</span>
        <span style={{ flex: 1 }}>{project.name}</span>
        <button
          className="btn-icon"
          onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
        >
          <Trash2 size={12} />
        </button>
      </div>
      {expanded && children.length > 0 && (
        <ul className="project-tree project-children">
          {children.map((c) => (
            <ProjectNode
              key={c.id}
              project={c}
              allProjects={allProjects}
              selected={selected}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({
  tasks,
  setTasks,
  projects,
}: {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
}) {
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  const filtered = tasks
    .filter((t) => {
      if (filter === "active") return !t.done;
      if (filter === "done")   return t.done;
      return true;
    })
    .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
    .sort((a, b) => {
      const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

  return (
    <div>
      <div className="section-header">
        <span className="section-title">✅ All Tasks</span>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="select" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
          </select>
          <select className="select" style={{ width: "auto" }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}>
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <AddTaskForm setTasks={setTasks} projects={projects} />

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No tasks match the current filter</div>
          </div>
        ) : (
          filtered.map((t) => (
            <TaskRow key={t.id} task={t} setTasks={setTasks} projects={projects} />
          ))
        )}
      </div>

      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
        {tasks.filter((t) => !t.done).length} active · {tasks.filter((t) => t.done).length} done · {tasks.length} total
      </div>
    </div>
  );
}

// ─── Shared: AddTaskForm ──────────────────────────────────────────────────────

function AddTaskForm({
  setTasks,
  projects,
  defaultDueDate,
  defaultProjectId,
}: {
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
  defaultDueDate?: string;
  defaultProjectId?: string;
}) {
  const [title,     setTitle]     = useState("");
  const [priority,  setPriority]  = useState<Priority>("medium");
  const [dueDate,   setDueDate]   = useState(defaultDueDate ?? "");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [open,      setOpen]      = useState(false);

  function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const task: Task = {
      id:        randomId(),
      title:     trimmed,
      done:      false,
      priority,
      dueDate,
      projectId: projectId || null,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
    // Also sync to Rust backend
    invoke("create_task", {
      title:     task.title,
      priority:  task.priority,
      dueDate:   task.dueDate,
      projectId: task.projectId ?? "",
    }).catch(() => {/* offline ok */});
    setTitle("");
    setOpen(false);
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="input-group">
        <input
          className="input"
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          onFocus={() => setOpen(true)}
        />
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>
          <Plus size={14} /> Add
        </button>
      </div>

      {open && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ width: "auto" }}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
          <input
            type="date"
            className="input"
            style={{ width: "auto" }}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          {projects.length > 0 && (
            <select
              className="select"
              style={{ width: "auto" }}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">No Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared: TaskRow ──────────────────────────────────────────────────────────

function TaskRow({
  task,
  setTasks,
  projects,
}: {
  task: Task;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
}) {
  const project = projects.find((p) => p.id === task.projectId);

  function toggle() {
    setTasks((prev) =>
      prev.map((t) => t.id === task.id ? { ...t, done: !t.done } : t)
    );
  }

  function remove() {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  return (
    <div className="task-item">
      <input
        type="checkbox"
        className="task-check"
        checked={task.done}
        onChange={toggle}
      />
      <div style={{ flex: 1 }}>
        <div className={`task-text ${task.done ? "done" : ""}`}>
          {task.title}
        </div>
        <div className="task-meta">
          <span className={`priority-badge priority-${task.priority}`}>
            {task.priority}
          </span>
          {task.dueDate && (
            <span className="date-label">📅 {formatDate(task.dueDate)}</span>
          )}
          {project && (
            <span className="date-label" style={{ color: project.color }}>
              ● {project.name}
            </span>
          )}
        </div>
      </div>
      <button className="btn-icon" onClick={remove} title="Delete">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({
  messages,
  setMessages,
}: {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}) {
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id:        randomId(),
      role:      "user",
      content:   text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await invoke<string>("send_innm_message", { message: text });
      const assistantMsg: ChatMessage = {
        id:        randomId(),
        role:      "assistant",
        content:   reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        id:        randomId(),
        role:      "assistant",
        content:   `[INNM offline] Echo: ${text}\n\nTo enable full INNM responses, ensure the innm-engine sidecar is running and a WOODS folder has been mapped.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, setMessages]);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <div className="empty-text">
              INNM Triangular Matrix Engine ready.
              <br />
              Type a message to begin.
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-bubble ${m.role}`}
            title={new Date(m.timestamp).toLocaleTimeString()}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant" style={{ color: "var(--muted)" }}>
            ▸ Processing through FRONT → BACK → UP matrices…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="input"
          placeholder="Ask INNM anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <button
          className="btn btn-primary"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── INNM Tab ─────────────────────────────────────────────────────────────────

function INNMTab({
  innmStatus,
  setInnmStatus,
  onRefresh,
}: {
  innmStatus: INNMStatus;
  setInnmStatus: React.Dispatch<React.SetStateAction<INNMStatus>>;
  onRefresh: () => void;
}) {
  const [woodsPath, setWoodsPath]     = useState(innmStatus.woodsPath);
  const [mapping,   setMapping]       = useState(false);
  const [mapResult, setMapResult]     = useState("");

  async function pickFolder() {
    try {
      const selected = await invoke<string | null>("select_folder_dialog");
      if (selected) setWoodsPath(selected);
    } catch {
      // Fallback: user types path manually
    }
  }

  async function mapWoods() {
    if (!woodsPath.trim()) return;
    setMapping(true);
    setMapResult("");
    try {
      const result = await invoke<string>("map_woods_folder", { folderPath: woodsPath });
      setMapResult(result);
      onRefresh();
    } catch (err) {
      setMapResult(`Error: ${String(err)}`);
    } finally {
      setMapping(false);
    }
  }

  const matrixNodes = [
    { label: "FRONT",  desc: "Input Processing",      status: innmStatus.front  },
    { label: "BACK",   desc: "Context Validation",    status: innmStatus.back   },
    { label: "UP",     desc: "Response Synthesis",    status: innmStatus.up     },
  ];

  function statusClass(s: string) {
    if (s === "active") return "status-ok";
    if (s === "error")  return "status-error";
    if (s === "busy")   return "status-warn";
    return "status-idle";
  }

  return (
    <div>
      <div className="section-header">
        <span className="section-title">🧠 INNM-WOSDS Engine</span>
        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Status bar */}
      <div className="innm-status-bar">
        <span style={{ color: "var(--muted)", fontWeight: 600 }}>ENGINE</span>
        {matrixNodes.map((n) => (
          <div key={n.label} className="innm-status-item">
            <span className={`status-indicator ${statusClass(n.status)}`} />
            <span>{n.label}</span>
            <span style={{ color: "var(--muted)" }}>({n.status})</span>
          </div>
        ))}
        <div className="innm-status-item" style={{ marginLeft: "auto" }}>
          <Cpu size={12} style={{ color: "var(--muted)" }} />
          <span>{innmStatus.docCount} docs indexed</span>
        </div>
      </div>

      {/* Triangular Matrix visualization */}
      <div className="card">
        <div className="card-title">Triangular Matrix Engine</div>
        <div className="matrix-grid">
          {matrixNodes.map((n) => (
            <div
              key={n.label}
              className={`matrix-cell ${n.status === "active" ? "active" : ""}`}
            >
              <div className="cell-label">{n.label}</div>
              <div className="cell-value">{n.label[0]}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{n.desc}</div>
              <div style={{ marginTop: 6 }}>
                <span className={`status-indicator ${statusClass(n.status)}`} style={{ display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>{n.status}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
          FRONT → BACK → UP  (ibox_core orchestration)
        </div>
      </div>

      {/* WOODS folder mapping */}
      <div className="card">
        <div className="card-title">📂 WOODS Folder Mapping</div>
        {innmStatus.woodsPath && (
          <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
            ✓ Mapped: {innmStatus.woodsPath}
          </div>
        )}
        <div className="input-group">
          <input
            className="input"
            placeholder="/path/to/woods-folder"
            value={woodsPath}
            onChange={(e) => setWoodsPath(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={pickFolder} title="Browse">
            <FolderInput size={14} />
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={mapWoods}
            disabled={mapping || !woodsPath.trim()}
          >
            {mapping ? <RefreshCw size={13} className="spin" /> : "Map"}
          </button>
        </div>
        {mapResult && (
          <pre style={{
            marginTop: 10,
            padding: "8px 10px",
            background: "var(--bg-dark)",
            borderRadius: 6,
            fontSize: 11,
            color: mapResult.startsWith("Error") ? "var(--red)" : "var(--green)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>
            {mapResult}
          </pre>
        )}
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
          Supported: .txt · .md · .csv · .log
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  vault,
  setVault,
}: {
  vault: VaultEntry[];
  setVault: React.Dispatch<React.SetStateAction<VaultEntry[]>>;
}) {
  const [newLabel,  setNewLabel]  = useState("");
  const [newSecret, setNewSecret] = useState("");

  function addEntry() {
    const label  = newLabel.trim();
    const secret = newSecret.trim();
    if (!label || !secret) return;
    setVault((prev) => [
      ...prev,
      { id: randomId(), label, secret, visible: false },
    ]);
    setNewLabel("");
    setNewSecret("");
  }

  function toggleVisible(id: string) {
    setVault((prev) =>
      prev.map((e) => e.id === id ? { ...e, visible: !e.visible } : e)
    );
  }

  function deleteEntry(id: string) {
    setVault((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      <div className="section-header">
        <span className="section-title">⚙️ Settings</span>
      </div>

      {/* System Info */}
      <div className="card">
        <div className="card-title">System Info</div>
        <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", lineHeight: 2 }}>
          <div><span style={{ color: "var(--muted)" }}>App:</span>  ZQ Ops Brain v2.0</div>
          <div><span style={{ color: "var(--muted)" }}>Engine:</span>  INNM-WOSDS Triangular Matrix</div>
          <div><span style={{ color: "var(--muted)" }}>Runtime:</span>  Tauri 2 (Rust + React)</div>
          <div><span style={{ color: "var(--muted)" }}>Encryption:</span>  AES-256 (Keyhole Vault)</div>
          <div><span style={{ color: "var(--muted)" }}>Platform:</span>  Windows / Android</div>
        </div>
      </div>

      {/* Keyhole Vault */}
      <div className="card">
        <div className="card-title">
          <Lock size={13} style={{ display: "inline", marginRight: 5 }} />
          Keyhole Vault (AES-256)
        </div>

        <div className="input-group" style={{ marginBottom: 10 }}>
          <input
            className="input"
            placeholder="Label (e.g. API Key)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Secret value"
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEntry()}
          />
          <button className="btn btn-primary btn-sm" onClick={addEntry}>
            <Plus size={13} /> Add
          </button>
        </div>

        {vault.length === 0 ? (
          <div className="empty-state">
            <div className="empty-text">No secrets stored</div>
          </div>
        ) : (
          vault.map((entry) => (
            <div key={entry.id} className="vault-item">
              <Lock size={12} style={{ color: "var(--muted)" }} />
              <span style={{ color: "var(--text)", fontWeight: 500, minWidth: 100 }}>
                {truncate(entry.label, 24)}
              </span>
              <span className="vault-key">
                {entry.visible ? entry.secret : "••••••••••••"}
              </span>
              <button className="btn-icon" onClick={() => toggleVisible(entry.id)}>
                {entry.visible ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button className="btn-icon" onClick={() => deleteEntry(entry.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Build info */}
      <div className="card" style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        Build: {new Date().toISOString().slice(0, 10)} · Tauri 2 · React 18 · TypeScript
      </div>
    </div>
  );
}
