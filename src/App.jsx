import { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import "./App.css";


const initialTasks = [
  {
    id: 1,
    title: "Learn React.js",
    description: "Practice React components and hooks",
    priority: "High",
    dueDate: "",
    completed: false,
  },
  {
    id: 2,
    title: "Complete college assignment",
    description: "Finish today's assignment",
    priority: "Medium",
    dueDate: "",
    completed: false,
  },
];

const navItems = [
  { name: "Dashboard", icon: "▦" },
  { name: "All Tasks", icon: "▤" },
  { name: "Pending Tasks", icon: "◷" },
  { name: "Completed Tasks", icon: "✓" },
];

function App() {
 const [tasks, setTasks] = useState([]);
const [tasksLoading, setTasksLoading] = useState(true);
const [taskError, setTaskError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState("Dashboard");
  const [user, setUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(
      currentUser
        ? {
            uid: currentUser.uid,
            name:
              currentUser.displayName ||
              currentUser.email?.split("@")[0],
            email: currentUser.email,
          }
        : null
    );

    setAuthLoading(false);
  });

  return unsubscribe;
}, []);

useEffect(() => {
  if (!user?.uid) {
    setTasks([]);
    setTasksLoading(false);
    return;
  }

  setTasksLoading(true);
  setTaskError("");

  const tasksRef = collection(db, "users", user.uid, "tasks");

  const unsubscribe = onSnapshot(
    tasksRef,
    (snapshot) => {
      const userTasks = snapshot.docs.map((taskDoc) => ({
        ...taskDoc.data(),
        id: taskDoc.id,
      }));

      setTasks(userTasks);
      setTasksLoading(false);
    },
    (error) => {
      console.error("Firestore loading error:", error);
      setTaskError(
        "Tasks load nahi hue. Firestore rules check karo."
      );
      setTasksLoading(false);
    }
  );

  return unsubscribe;
}, [user?.uid]);


  const [authMode, setAuthMode] = useState("Login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());

  

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;
  const highPriorityCount = tasks.filter((task) => task.priority === "High" && !task.completed).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchText = search.toLowerCase();
      const matchesSearch =
        (task.title || "").toLowerCase().includes(searchText) ||
        (task.description || "").toLowerCase().includes(searchText);
      const matchesPage =
        page === "Pending Tasks" ? !task.completed :
        page === "Completed Tasks" ? task.completed : true;
      const matchesFilter =
        filter === "All" ||
        (filter === "Pending" && !task.completed) ||
        (filter === "Completed" && task.completed) ||
        (filter === "High Priority" && task.priority === "High");
      return matchesSearch && matchesPage && matchesFilter;
    });
  }, [tasks, search, filter, page]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setDueDate("");
    setEditingId(null);
  }

  
async function saveTask(event) {
  event.preventDefault();

  if (!title.trim()) {
    setTaskError("Task title enter karo.");
    return;
  }

  if (!user?.uid) {
    setTaskError("Task save karne ke liye login karo.");
    return;
  }

  setTaskError("");

  const taskData = {
    title: title.trim(),
    description: description.trim(),
    priority,
    dueDate,
  };

  try {
    const tasksRef = collection(db, "users", user.uid, "tasks");

    if (editingId !== null) {
      const taskRef = doc(
        db,
        "users",
        user.uid,
        "tasks",
        String(editingId)
      );

      await updateDoc(taskRef, taskData);
    } else {
      await addDoc(tasksRef, {
        ...taskData,
        completed: false,
        createdAt: Date.now(),
      });
    }

    resetForm();
    setPage("All Tasks");
  } catch (error) {
    console.error("Task save error:", error);
    setTaskError(
      "Task save nahi hua. Internet aur Firestore rules check karo."
    );
  }
}

  function editTask(task) {
    setTitle(task.title || "");
    setDescription(task.description || "");
    setPriority(task.priority || "Medium");
    setDueDate(task.dueDate || "");
    setEditingId(task.id);
    setPage("All Tasks");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  
async function deleteTask(id) {
  if (!window.confirm("Are you sure you want to delete this task?")) {
    return;
  }

  if (!user?.uid) {
    setTaskError("Task delete karne ke liye login karo.");
    return;
  }

  setTaskError("");

  try {
    const taskRef = doc(
      db,
      "users",
      user.uid,
      "tasks",
      String(id)
    );

    await deleteDoc(taskRef);

    if (String(editingId) === String(id)) {
      resetForm();
    }
  } catch (error) {
    console.error("Task delete error:", error);
    setTaskError("Task delete nahi hua. Firebase console check karo.");
  }
}

async function toggleTask(id) {
  if (!user?.uid) {
    setTaskError("Pehle login karo.");
    return;
  }

  const task = tasks.find(
    (item) => String(item.id) === String(id)
  );

  if (!task) {
    setTaskError("Task nahi mila. Page refresh karke try karo.");
    return;
  }

  setTaskError("");

  try {
    const taskRef = doc(
      db,
      "users",
      user.uid,
      "tasks",
      String(task.id)
    );

    await updateDoc(taskRef, {
      completed: !task.completed,
    });
  } catch (error) {
    console.error("Toggle task error:", error);
    setTaskError("Task update nahi hua. Firebase document check karo.");
  }
}




async function handleAuth(event) {
  event.preventDefault();

  setAuthError("");


  if (!authEmail.trim() || !authPassword) {
    setAuthError("Please enter your email and password.");
    return;
  }

  if (authMode === "Signup" && !authName.trim()) {
    setAuthError("Please enter your name.");
    return;
  }

  try {
    if (authMode === "Signup") {
      const credential = await createUserWithEmailAndPassword(
        auth,
        authEmail.trim(),
        authPassword
      );

      await updateProfile(credential.user, {
        displayName: authName.trim(),
      });

      setUser({
        uid: credential.user.uid,
        name: authName.trim(),
        email: credential.user.email,
      });
    } else {
      await signInWithEmailAndPassword(
        auth,
        authEmail.trim(),
        authPassword
      );
    }

    setAuthPassword("");
  } catch (error) {
    const messages = {
      "auth/email-already-in-use": "This email is already registered. Please log in.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Password must contain at least 6 characters.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/network-request-failed": "Network error. Check your internet connection.",
    };

    setAuthError(
      messages[error.code] || error.message || "Authentication failed."
    );
  }
}

async function logout() {
  try {
    await signOut(auth);
    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
    setAuthMode("Login");
    setAuthError("");
    setPage("Dashboard");
    resetForm();
  } catch {
    setAuthError("Unable to log out. Please try again.");
  }
}

  function changeMonth(offset) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  const monthName = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
if (authLoading) {
  return <div className="auth-page">Checking login...</div>;
}
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-orb auth-orb-red" />
        <div className="auth-orb auth-orb-blue" />
        <form className="auth-card" onSubmit={handleAuth}>
          <div className="brand-logo">TM<span>✦</span></div>
          <p className="eyebrow">HERO MODE · PERSONAL WORKSPACE</p>
          <h1>Task<span>Master</span></h1>
          <p className="auth-subtitle">Your mission starts here. Plan it. Do it. Own it.</p>
          <div className="auth-tabs">
            <button type="button" className={authMode === "Login" ? "active" : ""} onClick={() => { setAuthMode("Login"); setAuthError(""); }}>Login</button>
            <button type="button" className={authMode === "Signup" ? "active" : ""} onClick={() => { setAuthMode("Signup"); setAuthError(""); }}>Sign Up</button>
          </div>
          {authMode === "Signup" && <label>Full name<input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Your name" required /></label>}
          <label>Email address<input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="you@example.com" required /></label>
          <label>Password<input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Enter your password" required /></label>
          {authError && <p className="error-message">{authError}</p>}
          <button type="submit" className="primary-button auth-submit">{authMode === "Login" ? "Enter Dashboard ↗" : "Create Workspace ↗"}</button>
          <p className="demo-note">Demo login only — this is not secure authentication.</p>
        </form>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand"><div className="brand-logo">TM<span>✦</span></div><span>Task<span className="brand-accent">Master</span></span></div>
        <div className="sidebar-label">MAIN MENU</div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button key={item.name} className={`nav-item ${page === item.name ? "selected" : ""}`} onClick={() => { setPage(item.name); setEditingId(null); }} type="button">
              <span className="nav-icon">{item.icon}</span><span>{item.name}</span>
              {item.name === "Pending Tasks" && <span className="nav-count">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-mission">
          <div className="mission-icon">⚡</div>
          <strong>Mission progress</strong>
          <p>{progress}% of your tasks completed</p>
          <div className="mini-progress"><span style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{(user?.name || user?.email || "U").charAt(0).toUpperCase()}</div>
          <div className="user-info"><strong>{user.name}</strong><span>Personal workspace</span></div>
          <button className="logout-button" onClick={logout} title="Log out" type="button">↗</button>
        </div>
      </aside>
            
      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">TM<span>✦</span> TaskMaster</div>
          <div className="weather-chip"><span className="weather-icon">☀</span><div><strong>YOUR WORKSPACE</strong><small>One task at a time</small></div></div>
          <label className="global-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your missions..." aria-label="Search tasks" /><kbd>⌘ K</kbd></label>
          <div className="topbar-actions"><span className="status-pill"><i /> SYSTEM ONLINE</span><button className="icon-button" type="button" title="Notifications">♧</button><div className="avatar top-avatar">{user.name.charAt(0).toUpperCase()}</div></div>
        </header>
          
        <div className="content-wrap">
          {taskError && (
  <p className="error-message" role="alert">
    {taskError}
  </p>
)}
          <div className="page-heading">
            <div><p className="eyebrow">YOUR PERSONAL COMMAND CENTER</p><h1>{page === "Dashboard" ? "Dashboard" : page}</h1><p className="heading-subtitle">Welcome back, {user.name}. Ready for your next mission?</p></div>
            <div className="heading-actions"><span className="date-chip">◷ {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span><button className="primary-button" onClick={() => { setPage("All Tasks"); resetForm(); document.querySelector(".task-form-card")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} type="button">＋ New Task</button></div>
          </div>

          {page === "Dashboard" && (
            <>
              <section className="stats-grid">
                <StatCard icon="▤" label="Total missions" value={tasks.length} detail="All assigned tasks" tone="blue" trend="OVERVIEW" />
                <StatCard icon="✓" label="Completed" value={completedCount} detail="Mission accomplished" tone="green" trend={`${progress}% DONE`} />
                <StatCard icon="◷" label="Pending" value={pendingCount} detail="Awaiting action" tone="red" trend="IN PROGRESS" />
                <StatCard icon="⚡" label="High priority" value={highPriorityCount} detail="Needs your focus" tone="gold" trend="PRIORITY" />
              </section>

              <section className="power-grid" aria-label="Superhero power systems">
                <article className="power-card power-spider">
                  <div className="power-symbol">◉</div>
                  <div className="power-copy"><small>SPIDER SENSE · TASK RADAR</small><strong>{pendingCount} missions detected</strong><span>Pending tasks that still need your attention.</span></div>
                  <div className="power-orbit" aria-hidden="true" />
                </article>
                <article className="power-card power-iron">
                  <div className="power-symbol">⬡</div>
                  <div className="power-copy"><small>IRON MODE · PRIORITY CORE</small><strong>{highPriorityCount} high-priority targets</strong><span>Keep your most important work in focus.</span></div>
                  <div className="power-orbit" aria-hidden="true" />
                </article>
                <article className="power-card power-thor">
                  <div className="power-symbol">ϟ</div>
                  <div className="power-copy"><small>THUNDER CORE · COMPLETION</small><strong>{progress}% power charged</strong><span>Every completed task boosts your progress.</span></div>
                  <div className="power-orbit" aria-hidden="true" />
                </article>
              </section>
              <section className="dashboard-grid">
                <div className="panel performance-panel">
                  <div className="panel-heading"><div><p className="eyebrow">ACTIVITY OVERVIEW</p><h2>Mission performance <span className="slash">/</span></h2></div><span className="panel-tag">LAST 7 DAYS</span></div>
                  <div className="chart-area">
                    <div className="chart-y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
                    <div className="bar-chart">
                      {[
                        Math.min(100, tasks.length * 12 + completedCount * 5),
                        Math.min(100, tasks.length * 9 + pendingCount * 6),
                        Math.min(100, tasks.length * 8 + highPriorityCount * 12),
                        Math.min(100, tasks.length * 10 + completedCount * 8),
                        Math.min(100, tasks.length * 7 + pendingCount * 9),
                        Math.min(100, tasks.length * 11 + completedCount * 6),
                        Math.min(100, tasks.length * 6 + highPriorityCount * 10 + completedCount * 4),
                      ].map((height, index) => <div className="bar-column" key={index}><div className={`chart-bar bar-${index}`} style={{ height: `${Math.max(8, height)}%` }} title={`Task activity index: ${Math.max(8, height)}%`} /><span>{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][index]}</span></div>)}
                    </div>
                  </div>
                  <div className="chart-footer"><span><i className="legend-dot blue-dot" /> Productivity index</span><strong>{progress}% <small>completion rate</small></strong></div>
                </div>

                <div className="panel focus-panel">
                  <div className="panel-heading"><div><p className="eyebrow">YOUR CURRENT STATUS</p><h2>Focus tracker</h2></div><span className="live-dot" /></div>
                  <div className="focus-ring" style={{ "--progress": `${progress}%` }}><div className="focus-ring-inner"><strong>{progress}<small>%</small></strong><span>COMPLETE</span></div></div>
                  <p className="focus-caption">{completedCount === tasks.length && tasks.length > 0 ? "All missions accomplished!" : "Keep the momentum going."}</p>
                  <div className="focus-stats"><span><i className="legend-dot red-dot" /> Pending <b>{pendingCount}</b></span><span><i className="legend-dot blue-dot" /> Done <b>{completedCount}</b></span></div>
                </div>

                <div className="panel calendar-panel">
                  <div className="panel-heading"><div><p className="eyebrow">PLAN AHEAD</p><h2>Mission calendar</h2></div><div className="calendar-controls"><button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button><button type="button" onClick={() => changeMonth(1)} aria-label="Next month">›</button></div></div>
                  <div className="calendar-month">{monthName}</div>
                  <div className="calendar-grid calendar-weekdays">{["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((day) => <span key={day}>{day}</span>)}</div>
                  <div className="calendar-grid">{calendarCells.map((day, index) => <button key={`${day}-${index}`} type="button" disabled={!day} className={`calendar-day ${day === selectedDate && calendarMonth.getMonth() === new Date().getMonth() ? "today" : ""} ${day === selectedDate ? "selected-day" : ""}`} onClick={() => day && setSelectedDate(day)}>{day || ""}</button>)}</div>
                  <div className="calendar-note"><span className="live-dot" /> Select a day to plan your next move</div>
                </div>

                <div className="panel recent-panel">
                  <div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Latest missions</h2></div><button className="text-button" type="button" onClick={() => setPage("All Tasks")}>View all ↗</button></div>
                  {tasks.slice(0, 3).length ? (
                    tasks.slice(0, 3).map((task) => (
                      <div className="recent-item" key={task.id}>
                        <input
  type="checkbox"
  className="task-checkbox"
  checked={Boolean(task.completed)}
  onChange={() => toggleTask(task.id)}
  aria-label={`Mark ${task.title} as completed`}
/>
                        <span className={`recent-icon ${task.completed ? "recent-done" : ""}`}>{task.completed ? "✓" : "⚡"}</span>
                        <div className="recent-copy">
                          <strong>{task.title}</strong>
                          <span>{task.dueDate ? `Due ${task.dueDate}` : `${task.priority} priority`}</span>
                        </div>
                        <span className={`status-badge ${task.completed ? "status-completed" : task.priority === "High" ? "status-high" : "status-pending"}`}>
                          {task.completed ? "Done" : "Active"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="muted-note">No missions yet. Add your first task.</p>
                  )}
                </div>
              </section>
            </>
          )}
          <section className="panel task-form-card">
            <div className="panel-heading"><div><p className="eyebrow">{editingId !== null ? "UPDATE YOUR MISSION" : "MISSION CONTROL"}</p><h2>{editingId !== null ? "Edit task" : "Create a new task"}</h2></div><span className="panel-tag">✦ TASK MANAGER</span></div>
            <form className="task-form" onSubmit={saveTask}>
              <label>Task title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" required /></label>
              <label className="description-field">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add mission details..." rows={2} /></label>
              <div className="form-row">
                <label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="High">High priority</option><option value="Medium">Medium priority</option><option value="Low">Low priority</option></select></label>
                <label>Due date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
              </div>
              <div className="form-actions">{editingId !== null && <button type="button" className="secondary-button" onClick={resetForm}>Cancel</button>}<button type="submit" className="primary-button">{editingId !== null ? "Save changes ↗" : "＋ Add mission"}</button></div>
            </form>
          </section>

          <section className="panel task-list-panel">
            <div className="panel-heading"><div><p className="eyebrow">MISSION LOG</p><h2>{page === "Dashboard" ? "Your tasks" : page} <span className="task-count">{filteredTasks.length}</span></h2></div><div className="list-controls"><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter tasks"><option value="All">All tasks</option><option value="Pending">Pending</option><option value="Completed">Completed</option><option value="High Priority">High priority</option></select></div></div>
            <div className="task-table-head"><span>MISSION</span><span>PRIORITY</span><span>DUE DATE</span><span>STATUS</span><span>ACTIONS</span></div>
            <div className="task-list">
              {filteredTasks.length === 0 ? <div className="empty-state"><span>✦</span><h3>No missions found</h3><p>Add a task or adjust your search and filters.</p></div> :
                filteredTasks.map((task) => <article className={`task-row ${task.completed ? "task-completed" : ""}`} key={task.id}>
                  <button type="button" className={`check-button ${task.completed ? "checked" : ""}`} onClick={() => toggleTask(task.id)} aria-label={task.completed ? "Mark pending" : "Mark completed"}>{task.completed ? "✓" : ""}</button>
                  <div className="task-details"><h3>{task.title}</h3><p>{task.description || "No description added"}</p></div>
                  <div className="task-priority-cell"><span className={`priority-badge priority-${(task.priority || "Medium").toLowerCase()}`}><i />{task.priority}</span></div>
                  <div className="task-date-cell">{task.dueDate || "No due date"}</div>
                  <div><span className={`status-badge ${task.completed ? "status-completed" : "status-pending"}`}>{task.completed ? "Completed" : "In progress"}</span></div>
                  <div className="task-actions"><button type="button" onClick={() => editTask(task)} title="Edit task" aria-label="Edit task">✎</button><button type="button" onClick={() => deleteTask(task.id)} title="Delete task" aria-label="Delete task">×</button></div>
                </article>)
              }
            </div>
          </section>
          <footer className="app-footer"><span>TM✦ TASKMASTER</span><span>Stay focused. Make every mission count.</span><span>● SYSTEM ONLINE</span></footer>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, detail, tone, trend }) {
  return <article className={`stat-card stat-${tone}`}><div className="stat-card-top"><span className="stat-icon">{icon}</span><span className="stat-trend">{trend}</span></div><p>{label}</p><h2>{value}</h2><span className="stat-detail">{detail}</span><span className="stat-card-glow" /></article>;
}

export default App;
