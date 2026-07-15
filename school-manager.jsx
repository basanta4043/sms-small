import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Wallet, Receipt, GraduationCap, ClipboardList, FileText,
  Settings as SettingsIcon, LogOut, Plus, Search, Pencil, Trash2,
  Printer, X, Check, ChevronRight, School, Lock, UserPlus
} from "lucide-react";

/* ---------------------------------- utils ---------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_GRADE_SCALE = [
  { min: 90, grade: "A+", remark: "Outstanding" },
  { min: 80, grade: "A", remark: "Excellent" },
  { min: 70, grade: "B+", remark: "Very Good" },
  { min: 60, grade: "B", remark: "Good" },
  { min: 50, grade: "C+", remark: "Satisfactory" },
  { min: 40, grade: "C", remark: "Fair" },
  { min: 33, grade: "D", remark: "Needs Improvement" },
  { min: 0, grade: "F", remark: "Fail" },
];

function gradeFor(pct, scale) {
  const s = [...scale].sort((a, b) => b.min - a.min);
  for (const row of s) if (pct >= row.min) return row;
  return s[s.length - 1];
}

async function loadJSON(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    return res ? JSON.parse(res.value) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveJSON(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error("storage save failed", key, e);
  }
}

/* ---------------------------------- style ---------------------------------- */

const Style = () => (
  <style>{`
    .sm-root{
      --ink:#1B2A4A; --ink-soft:#2E4066; --paper:#FBF8F2; --line:#E4DFD3;
      --slate:#5C6B7A; --marigold:#C98A2B; --marigold-soft:#F3E3C6;
      --sage:#4F7A5C; --sage-soft:#E4EEE6; --rust:#A8422E; --rust-soft:#F3E1DC;
      --card:#FFFFFF;
      font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
      background: var(--paper);
      color: var(--ink);
      min-height: 100%;
      width: 100%;
    }
    .sm-root *{ box-sizing: border-box; }
    .sm-display{ font-family: 'Fraunces', 'Georgia', serif; }
    .sm-mono{ font-family: 'IBM Plex Mono', monospace; }

    /* ---- Auth screens ---- */
    .sm-auth-wrap{
      min-height: 640px; display:flex; align-items:center; justify-content:center;
      background:
        radial-gradient(circle at 15% 20%, rgba(201,138,43,0.10), transparent 40%),
        radial-gradient(circle at 85% 80%, rgba(79,122,92,0.10), transparent 40%),
        var(--paper);
      padding: 32px 16px;
    }
    .sm-auth-card{
      width: 100%; max-width: 400px; background: var(--card);
      border: 1px solid var(--line); border-radius: 14px;
      padding: 36px 32px; box-shadow: 0 18px 40px -20px rgba(27,42,74,0.35);
    }
    .sm-seal{
      width:56px;height:56px;border-radius:50%;
      background: linear-gradient(155deg, var(--ink), var(--ink-soft));
      color: var(--marigold-soft); display:flex; align-items:center; justify-content:center;
      margin: 0 auto 18px; box-shadow: 0 0 0 4px var(--marigold-soft);
    }
    .sm-auth-title{ font-size: 24px; text-align:center; margin: 0 0 4px; }
    .sm-auth-sub{ text-align:center; color: var(--slate); font-size: 13px; margin-bottom: 24px; }
    .sm-field{ margin-bottom: 16px; }
    .sm-label{ display:block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--slate); margin-bottom: 6px; font-weight:600;}
    .sm-input, .sm-select, .sm-textarea{
      width:100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px;
      font-size: 14px; background: var(--paper); color: var(--ink); font-family: inherit;
    }
    .sm-input:focus, .sm-select:focus, .sm-textarea:focus{ outline: 2px solid var(--marigold); outline-offset: 1px; border-color: var(--marigold);}
    .sm-btn{
      display:inline-flex; align-items:center; justify-content:center; gap:6px;
      padding: 10px 18px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: transform .08s ease, box-shadow .15s ease;
    }
    .sm-btn:active{ transform: translateY(1px); }
    .sm-btn-primary{ background: var(--ink); color: #fff; }
    .sm-btn-primary:hover{ background: var(--ink-soft); }
    .sm-btn-gold{ background: var(--marigold); color: #fff; }
    .sm-btn-gold:hover{ box-shadow: 0 6px 14px -6px rgba(201,138,43,0.6); }
    .sm-btn-ghost{ background: transparent; color: var(--ink); border: 1px solid var(--line); }
    .sm-btn-ghost:hover{ background: var(--paper); }
    .sm-btn-danger{ background: var(--rust-soft); color: var(--rust); }
    .sm-btn-danger:hover{ background: #ecd0c8; }
    .sm-btn-block{ width:100%; }
    .sm-error{ background: var(--rust-soft); color: var(--rust); font-size: 13px; padding: 8px 12px; border-radius: 8px; margin-bottom: 14px; }
    .sm-link{ background:none;border:none;color:var(--marigold); font-weight:600; cursor:pointer; font-size:13px; font-family:inherit; padding:0;}

    /* ---- App shell ---- */
    .sm-shell{ display:flex; min-height: 640px; }
    .sm-sidebar{
      width: 218px; background: var(--ink); color: #EFE7D6; padding: 22px 0;
      display:flex; flex-direction:column; flex-shrink:0;
    }
    .sm-brand{ display:flex; align-items:center; gap:10px; padding: 0 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.12); margin-bottom: 14px;}
    .sm-brand-seal{ width:34px;height:34px;border-radius:50%; background: var(--marigold); display:flex;align-items:center;justify-content:center; flex-shrink:0;}
    .sm-brand-name{ font-family:'Fraunces',serif; font-size:15px; line-height:1.2; }
    .sm-nav{ display:flex; flex-direction:column; gap:2px; padding: 0 10px; flex:1; }
    .sm-tab{
      display:flex; align-items:center; gap:10px; padding: 10px 12px; border-radius: 10px 10px 4px 4px;
      color: #CBD3E0; background: transparent; border:none; text-align:left; cursor:pointer;
      font-family: inherit; font-size: 13.5px; font-weight: 500; position:relative;
    }
    .sm-tab:hover{ background: rgba(255,255,255,0.06); color:#fff; }
    .sm-tab.active{
      background: var(--paper); color: var(--ink); font-weight:700;
      box-shadow: 0 4px 10px rgba(0,0,0,0.18);
    }
    .sm-sidebar-foot{ padding: 12px 14px 0; border-top: 1px solid rgba(255,255,255,0.12); margin-top: 10px;}
    .sm-user-row{ display:flex; align-items:center; justify-content:space-between; font-size:12.5px; color:#CBD3E0; }

    .sm-main{ flex:1; background: var(--paper); min-width:0; }
    .sm-topbar{
      display:flex; align-items:center; justify-content:space-between;
      padding: 18px 28px; border-bottom: 1px solid var(--line);
    }
    .sm-page-title{ font-size: 21px; margin:0; }
    .sm-page-sub{ color: var(--slate); font-size: 12.5px; margin-top:2px;}
    .sm-content{ padding: 22px 28px 40px; }

    /* ---- Cards / stats ---- */
    .sm-stat-grid{ display:grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 22px;}
    .sm-stat{ background: var(--card); border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
    .sm-stat-label{ font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--slate); font-weight:600;}
    .sm-stat-value{ font-family:'Fraunces',serif; font-size:26px; margin-top:6px; }

    /* ---- Table ---- */
    .sm-panel{ background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow:hidden; }
    .sm-panel-head{ display:flex; align-items:center; justify-content:space-between; padding: 14px 18px; border-bottom: 1px solid var(--line); gap: 10px; flex-wrap:wrap;}
    .sm-search{ display:flex; align-items:center; gap:8px; border:1px solid var(--line); border-radius:8px; padding: 7px 10px; background:var(--paper); min-width:200px;}
    .sm-search input{ border:none; background:transparent; outline:none; font-size:13.5px; width:100%; font-family:inherit; color:var(--ink);}
    table.sm-table{ width:100%; border-collapse: collapse; font-size: 13.5px;}
    .sm-table th{ text-align:left; padding: 10px 18px; background: var(--paper); color: var(--slate); font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid var(--line); font-weight:600;}
    .sm-table td{ padding: 11px 18px; border-bottom: 1px solid var(--line); vertical-align: middle;}
    .sm-table tr:last-child td{ border-bottom:none; }
    .sm-table tr:hover td{ background: #FCFAF5; }
    .sm-empty{ padding: 46px 20px; text-align:center; color: var(--slate); }
    .sm-pill{ display:inline-flex; align-items:center; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight:700; letter-spacing:.02em;}
    .sm-pill-sage{ background: var(--sage-soft); color: var(--sage); }
    .sm-pill-rust{ background: var(--rust-soft); color: var(--rust); }
    .sm-pill-gold{ background: var(--marigold-soft); color: #8A611E; }
    .sm-icon-btn{ background:none; border:none; cursor:pointer; color: var(--slate); padding:5px; border-radius:6px; display:inline-flex;}
    .sm-icon-btn:hover{ background: var(--paper); color: var(--ink); }

    /* ---- Modal ---- */
    .sm-modal-overlay{ position:fixed; inset:0; background: rgba(27,42,74,0.45); display:flex; align-items:flex-start; justify-content:center; z-index:50; padding: 40px 16px; overflow:auto;}
    .sm-modal{ background: var(--card); border-radius: 14px; width:100%; max-width:520px; padding: 26px 28px 28px; box-shadow: 0 30px 60px -20px rgba(0,0,0,0.4);}
    .sm-modal-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 18px;}
    .sm-modal-title{ font-size: 19px; margin:0;}
    .sm-form-grid{ display:grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .sm-form-grid .span2{ grid-column: 1 / -1; }
    .sm-modal-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top: 18px; }
    .sm-divider{ height:1px; background: var(--line); margin: 18px 0; }
    .sm-note{ font-size:12.5px; color:var(--slate); margin-top:4px;}

    /* Ledger tab items for sub-navigation */
    .sm-subtabs{ display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap;}
    .sm-subtab{ padding:7px 14px; border-radius:8px 8px 0 0; border:1px solid var(--line); border-bottom:none; background:var(--paper); color:var(--slate); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; position:relative; top:1px;}
    .sm-subtab.active{ background:var(--card); color:var(--ink); border-color:var(--line); box-shadow: 0 -2px 0 var(--marigold) inset;}

    /* ---- Print area (invoices / gradesheets) ---- */
    .sm-print-doc{ background:#fff; border:1px solid var(--line); border-radius:10px; padding: 30px 34px; max-width: 560px; margin: 0 auto;}
    .sm-print-seal{ width:44px;height:44px;border-radius:50%; border:2px solid var(--ink); display:flex; align-items:center; justify-content:center; color:var(--ink); font-family:'Fraunces',serif; font-weight:700;}
    .sm-print-head{ display:flex; align-items:center; justify-content:space-between; border-bottom: 2px solid var(--ink); padding-bottom:14px; margin-bottom:18px;}
    .sm-stamp{
      display:inline-block; border:2px solid var(--sage); color:var(--sage); font-weight:800;
      padding:4px 14px; border-radius:6px; transform: rotate(-6deg); font-size:13px; letter-spacing:.08em;
    }
    .sm-stamp-due{ border-color: var(--rust); color: var(--rust); }

    @media print{
      body *{ visibility:hidden !important; }
      .sm-print-area, .sm-print-area *{ visibility:visible !important; }
      .sm-print-area{ position:absolute; top:0; left:0; width:100%; padding:20px; }
      .sm-no-print{ display:none !important; }
    }

    @media (max-width: 760px){
      .sm-shell{ flex-direction:column; }
      .sm-sidebar{ width:100%; flex-direction:row; overflow-x:auto; padding:12px; }
      .sm-brand{ display:none; }
      .sm-nav{ flex-direction:row; padding:0; }
      .sm-sidebar-foot{ display:none; }
      .sm-stat-grid{ grid-template-columns: 1fr 1fr; }
      .sm-form-grid{ grid-template-columns: 1fr; }
      .sm-content{ padding: 16px; }
    }
  `}</style>
);

/* ---------------------------------- shared bits ---------------------------------- */

function Field({ label, children, span2 }) {
  return (
    <div className={"sm-field" + (span2 ? " span2" : "")}>
      <label className="sm-label">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="sm-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sm-modal" style={wide ? { maxWidth: 640 } : undefined}>
        <div className="sm-modal-head">
          <h3 className="sm-modal-title sm-display">{title}</h3>
          <button className="sm-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="sm-empty">{text}</div>;
}

/* ---------------------------------- Auth ---------------------------------- */

function AuthGate({ onReady }) {
  const [phase, setPhase] = useState("loading"); // loading | setup | login
  const [auth, setAuth] = useState(null);
  const [schoolName, setSchoolName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const a = await loadJSON("auth", null);
      if (a) { setAuth(a); setPhase("login"); }
      else setPhase("setup");
    })();
  }, []);

  async function handleSetup(e) {
    e.preventDefault();
    setErr("");
    if (!schoolName.trim()) return setErr("Please enter your school's name.");
    if (!username.trim()) return setErr("Choose an admin username.");
    if (password.length < 4) return setErr("Password should be at least 4 characters.");
    if (password !== password2) return setErr("Passwords don't match.");
    setBusy(true);
    const hash = await sha256(password);
    const authObj = { username: username.trim(), passwordHash: hash };
    await saveJSON("auth", authObj);
    await saveJSON("school-info", { name: schoolName.trim(), address: "", currency: "Rs." });
    setBusy(false);
    onReady();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const hash = await sha256(password);
    setBusy(false);
    if (username.trim() === auth.username && hash === auth.passwordHash) {
      onReady();
    } else {
      setErr("Incorrect username or password.");
    }
  }

  if (phase === "loading") return <div className="sm-auth-wrap"><p style={{ color: "var(--slate)" }}>Loading…</p></div>;

  if (phase === "setup") {
    return (
      <div className="sm-auth-wrap">
        <div className="sm-auth-card">
          <div className="sm-seal"><School size={26} /></div>
          <h2 className="sm-auth-title sm-display">Set up your school</h2>
          <p className="sm-auth-sub">Create the admin account that manages this school's records.</p>
          {err && <div className="sm-error">{err}</div>}
          <form onSubmit={handleSetup}>
            <Field label="School name">
              <input className="sm-input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g. Everest Valley School" />
            </Field>
            <Field label="Admin username">
              <input className="sm-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </Field>
            <Field label="Password">
              <input className="sm-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" />
            </Field>
            <Field label="Confirm password">
              <input className="sm-input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </Field>
            <button className="sm-btn sm-btn-gold sm-btn-block" disabled={busy}><UserPlus size={16} /> Create admin account</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="sm-auth-wrap">
      <div className="sm-auth-card">
        <div className="sm-seal"><Lock size={22} /></div>
        <h2 className="sm-auth-title sm-display">Welcome back</h2>
        <p className="sm-auth-sub">Log in to manage your school's records.</p>
        {err && <div className="sm-error">{err}</div>}
        <form onSubmit={handleLogin}>
          <Field label="Username">
            <input className="sm-input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </Field>
          <Field label="Password">
            <input className="sm-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="sm-btn sm-btn-gold sm-btn-block" disabled={busy}><Lock size={16} /> Log in</button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------- Students ---------------------------------- */

function StudentForm({ initial, onSave, onClose }) {
  const [f, setF] = useState(initial || {
    rollNo: "", name: "", className: "", section: "", gender: "Female",
    dob: "", guardianName: "", phone: "", address: "", admissionDate: todayStr(), status: "Active",
  });
  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }
  function submit(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.className.trim()) return;
    onSave({ ...f, id: f.id || uid() });
  }
  return (
    <Modal title={initial ? "Edit student" : "Add student"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="sm-form-grid">
          <Field label="Full name"><input className="sm-input" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
          <Field label="Roll number"><input className="sm-input" value={f.rollNo} onChange={(e) => set("rollNo", e.target.value)} /></Field>
          <Field label="Class / Grade"><input className="sm-input" value={f.className} onChange={(e) => set("className", e.target.value)} placeholder="e.g. Grade 5" /></Field>
          <Field label="Section"><input className="sm-input" value={f.section} onChange={(e) => set("section", e.target.value)} placeholder="e.g. A" /></Field>
          <Field label="Gender">
            <select className="sm-select" value={f.gender} onChange={(e) => set("gender", e.target.value)}>
              <option>Female</option><option>Male</option><option>Other</option>
            </select>
          </Field>
          <Field label="Date of birth"><input type="date" className="sm-input" value={f.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          <Field label="Guardian name"><input className="sm-input" value={f.guardianName} onChange={(e) => set("guardianName", e.target.value)} /></Field>
          <Field label="Contact phone"><input className="sm-input" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Admission date"><input type="date" className="sm-input" value={f.admissionDate} onChange={(e) => set("admissionDate", e.target.value)} /></Field>
          <Field label="Status">
            <select className="sm-select" value={f.status} onChange={(e) => set("status", e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </select>
          </Field>
          <Field label="Address" span2><input className="sm-input" value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
        </div>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary"><Check size={16} /> Save student</button>
        </div>
      </form>
    </Modal>
  );
}

function StudentsTab({ students, setStudents }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      [s.name, s.rollNo, s.className, s.section, s.guardianName].join(" ").toLowerCase().includes(term)
    );
  }, [students, q]);

  function save(student) {
    setStudents((prev) => {
      const exists = prev.some((s) => s.id === student.id);
      return exists ? prev.map((s) => (s.id === student.id ? student : s)) : [...prev, student];
    });
    setShowForm(false); setEditing(null);
  }
  function remove(id) {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setConfirmDel(null);
  }

  return (
    <div>
      <div className="sm-panel">
        <div className="sm-panel-head">
          <div className="sm-search"><Search size={15} color="var(--slate)" /><input placeholder="Search name, roll no, class…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button className="sm-btn sm-btn-gold" onClick={() => { setEditing(null); setShowForm(true); }}><Plus size={16} /> Add student</button>
        </div>
        {filtered.length === 0 ? (
          <Empty text={students.length === 0 ? "No students yet. Add your first student to get started." : "No students match your search."} />
        ) : (
          <table className="sm-table">
            <thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Guardian</th><th>Contact</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="sm-mono">{s.rollNo || "—"}</td>
                  <td>{s.name}</td>
                  <td>{s.className}{s.section ? ` · ${s.section}` : ""}</td>
                  <td>{s.guardianName || "—"}</td>
                  <td>{s.phone || "—"}</td>
                  <td><span className={"sm-pill " + (s.status === "Active" ? "sm-pill-sage" : "sm-pill-rust")}>{s.status}</span></td>
                  <td>
                    <button className="sm-icon-btn" onClick={() => { setEditing(s); setShowForm(true); }}><Pencil size={15} /></button>
                    <button className="sm-icon-btn" onClick={() => setConfirmDel(s)}><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showForm && <StudentForm initial={editing} onSave={save} onClose={() => { setShowForm(false); setEditing(null); }} />}
      {confirmDel && (
        <Modal title="Remove student?" onClose={() => setConfirmDel(null)}>
          <p style={{ fontSize: 14, color: "var(--slate)" }}>This will remove <strong>{confirmDel.name}</strong> from your student list. Fee and result records already saved will remain but won't show a linked name.</p>
          <div className="sm-modal-actions">
            <button className="sm-btn sm-btn-ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="sm-btn sm-btn-danger" onClick={() => remove(confirmDel.id)}><Trash2 size={15} /> Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------- Fees ---------------------------------- */

function FeeStructureForm({ initial, onSave, onClose }) {
  const [className, setClassName] = useState(initial?.className || "");
  const [items, setItems] = useState(initial?.items || [{ name: "Tuition", amount: "" }]);
  function updateItem(i, k, v) { setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it))); }
  function addItem() { setItems((p) => [...p, { name: "", amount: "" }]); }
  function removeItem(i) { setItems((p) => p.filter((_, idx) => idx !== i)); }
  function submit(e) {
    e.preventDefault();
    if (!className.trim()) return;
    const cleanItems = items.filter((it) => it.name.trim()).map((it) => ({ name: it.name.trim(), amount: Number(it.amount) || 0 }));
    const total = cleanItems.reduce((s, it) => s + it.amount, 0);
    onSave({ id: initial?.id || uid(), className: className.trim(), items: cleanItems, total });
  }
  return (
    <Modal title={initial ? "Edit fee structure" : "Add fee structure"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Class / Grade"><input className="sm-input" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 5" /></Field>
        <div className="sm-divider" />
        <label className="sm-label">Fee items</label>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="sm-input" placeholder="Item name (e.g. Tuition)" value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
            <input className="sm-input" style={{ maxWidth: 130 }} type="number" placeholder="Amount" value={it.amount} onChange={(e) => updateItem(i, "amount", e.target.value)} />
            <button type="button" className="sm-icon-btn" onClick={() => removeItem(i)}><X size={16} /></button>
          </div>
        ))}
        <button type="button" className="sm-btn sm-btn-ghost" onClick={addItem}><Plus size={14} /> Add item</button>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary"><Check size={16} /> Save structure</button>
        </div>
      </form>
    </Modal>
  );
}

function CollectFeeForm({ students, feeData, currency, onSave, onClose }) {
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());

  const student = students.find((s) => s.id === studentId);
  const structure = feeData.feeStructures.find((f) => f.className.trim().toLowerCase() === (student?.className || "").trim().toLowerCase());
  const paidSoFar = feeData.payments.filter((p) => p.studentId === studentId).reduce((s, p) => s + p.amount, 0);
  const due = structure ? Math.max(structure.total - paidSoFar, 0) : null;

  function submit(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!studentId || !amt || amt <= 0) return;
    onSave({ studentId, amount: amt, method, note: note.trim(), date });
  }

  return (
    <Modal title="Record a fee payment" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Student">
          <select className="sm-select" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.length === 0 && <option value="">No students yet</option>}
            {students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.className}</option>)}
          </select>
        </Field>
        {structure ? (
          <p className="sm-note">Fee structure for {student.className}: {currency}{structure.total}. Paid so far: {currency}{paidSoFar}. Due: <strong>{currency}{due}</strong></p>
        ) : (
          <p className="sm-note">No fee structure set for this class yet — you can still record the payment.</p>
        )}
        <div className="sm-form-grid">
          <Field label={`Amount (${currency})`}><input className="sm-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
          <Field label="Payment date"><input className="sm-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Method">
            <select className="sm-select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Cash</option><option>Bank transfer</option><option>Mobile wallet</option><option>Cheque</option>
            </select>
          </Field>
          <Field label="Note (optional)"><input className="sm-input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary" disabled={students.length === 0}><Check size={16} /> Record payment &amp; create invoice</button>
        </div>
      </form>
    </Modal>
  );
}

function FeesTab({ students, feeData, setFeeData, currency, onOpenInvoice }) {
  const [sub, setSub] = useState("structures");
  const [showStructForm, setShowStructForm] = useState(false);
  const [editStruct, setEditStruct] = useState(null);
  const [showCollect, setShowCollect] = useState(false);

  function saveStructure(s) {
    setFeeData((prev) => {
      const exists = prev.feeStructures.some((x) => x.id === s.id);
      const feeStructures = exists ? prev.feeStructures.map((x) => (x.id === s.id ? s : x)) : [...prev.feeStructures, s];
      return { ...prev, feeStructures };
    });
    setShowStructForm(false); setEditStruct(null);
  }
  function removeStructure(id) {
    setFeeData((prev) => ({ ...prev, feeStructures: prev.feeStructures.filter((x) => x.id !== id) }));
  }

  function recordPayment({ studentId, amount, method, note, date }) {
    setFeeData((prev) => {
      const invoiceNo = `INV-${String(prev.nextInvoiceNo).padStart(4, "0")}`;
      const invoiceId = uid();
      const student = students.find((s) => s.id === studentId);
      const invoice = {
        id: invoiceId, invoiceNo, studentId, studentName: student?.name || "—", studentClass: student?.className || "—",
        date, amount, method, note, status: "Paid",
      };
      const payment = { id: uid(), studentId, amount, method, note, date, invoiceId };
      return {
        ...prev,
        payments: [...prev.payments, payment],
        invoices: [...prev.invoices, invoice],
        nextInvoiceNo: prev.nextInvoiceNo + 1,
      };
    });
    setShowCollect(false);
  }

  const dueByStudent = students.map((s) => {
    const structure = feeData.feeStructures.find((f) => f.className.trim().toLowerCase() === s.className.trim().toLowerCase());
    const paid = feeData.payments.filter((p) => p.studentId === s.id).reduce((sum, p) => sum + p.amount, 0);
    const total = structure ? structure.total : null;
    const due = total !== null ? Math.max(total - paid, 0) : null;
    return { student: s, total, paid, due };
  });

  return (
    <div>
      <div className="sm-subtabs">
        <button className={"sm-subtab" + (sub === "structures" ? " active" : "")} onClick={() => setSub("structures")}>Fee structure</button>
        <button className={"sm-subtab" + (sub === "dues" ? " active" : "")} onClick={() => setSub("dues")}>Student dues</button>
        <button className={"sm-subtab" + (sub === "payments" ? " active" : "")} onClick={() => setSub("payments")}>Payment history</button>
      </div>

      {sub === "structures" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <span style={{ fontSize: 13, color: "var(--slate)" }}>Set what each class owes for the year/term.</span>
            <button className="sm-btn sm-btn-gold" onClick={() => { setEditStruct(null); setShowStructForm(true); }}><Plus size={16} /> Add class fee</button>
          </div>
          {feeData.feeStructures.length === 0 ? <Empty text="No fee structures set yet." /> : (
            <table className="sm-table">
              <thead><tr><th>Class</th><th>Items</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {feeData.feeStructures.map((f) => (
                  <tr key={f.id}>
                    <td>{f.className}</td>
                    <td style={{ color: "var(--slate)" }}>{f.items.map((it) => it.name).join(", ")}</td>
                    <td className="sm-mono">{currency}{f.total}</td>
                    <td>
                      <button className="sm-icon-btn" onClick={() => { setEditStruct(f); setShowStructForm(true); }}><Pencil size={15} /></button>
                      <button className="sm-icon-btn" onClick={() => removeStructure(f.id)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sub === "dues" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <span style={{ fontSize: 13, color: "var(--slate)" }}>Who owes what, based on class fee structures.</span>
            <button className="sm-btn sm-btn-gold" onClick={() => setShowCollect(true)}><Plus size={16} /> Collect fee</button>
          </div>
          {dueByStudent.length === 0 ? <Empty text="Add students first to see dues here." /> : (
            <table className="sm-table">
              <thead><tr><th>Student</th><th>Class</th><th>Total fee</th><th>Paid</th><th>Due</th></tr></thead>
              <tbody>
                {dueByStudent.map(({ student, total, paid, due }) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.className}</td>
                    <td className="sm-mono">{total === null ? "—" : currency + total}</td>
                    <td className="sm-mono">{currency}{paid}</td>
                    <td>{total === null ? <span style={{ color: "var(--slate)" }}>No structure</span> : due === 0 ? <span className="sm-pill sm-pill-sage">Cleared</span> : <span className="sm-pill sm-pill-rust">{currency}{due} due</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {sub === "payments" && (
        <div className="sm-panel">
          <div className="sm-panel-head">
            <span style={{ fontSize: 13, color: "var(--slate)" }}>Every fee payment recorded, newest first.</span>
            <button className="sm-btn sm-btn-gold" onClick={() => setShowCollect(true)}><Plus size={16} /> Collect fee</button>
          </div>
          {feeData.payments.length === 0 ? <Empty text="No payments recorded yet." /> : (
            <table className="sm-table">
              <thead><tr><th>Date</th><th>Student</th><th>Amount</th><th>Method</th><th>Invoice</th></tr></thead>
              <tbody>
                {[...feeData.payments].sort((a, b) => (a.date < b.date ? 1 : -1)).map((p) => {
                  const student = students.find((s) => s.id === p.studentId);
                  const invoice = feeData.invoices.find((i) => i.id === p.invoiceId);
                  return (
                    <tr key={p.id}>
                      <td>{fmtDate(p.date)}</td>
                      <td>{student?.name || "—"}</td>
                      <td className="sm-mono">{currency}{p.amount}</td>
                      <td>{p.method}</td>
                      <td>
                        {invoice ? <button className="sm-btn sm-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => onOpenInvoice(invoice)}><Printer size={13} /> {invoice.invoiceNo}</button> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showStructForm && <FeeStructureForm initial={editStruct} onSave={saveStructure} onClose={() => { setShowStructForm(false); setEditStruct(null); }} />}
      {showCollect && <CollectFeeForm students={students} feeData={feeData} currency={currency} onSave={recordPayment} onClose={() => setShowCollect(false)} />}
    </div>
  );
}

/* ---------------------------------- Invoices ---------------------------------- */

function InvoiceDoc({ invoice, school, currency, onClose }) {
  return (
    <Modal title="" onClose={onClose} wide>
      <div className="sm-no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <button className="sm-btn sm-btn-gold" onClick={() => window.print()}><Printer size={15} /> Print</button>
      </div>
      <div className="sm-print-area">
        <div className="sm-print-doc">
          <div className="sm-print-head">
            <div>
              <div className="sm-display" style={{ fontSize: 20 }}>{school.name || "Your School"}</div>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>{school.address}</div>
            </div>
            <div className="sm-print-seal">{(school.name || "S").trim()[0]?.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", textTransform: "uppercase" }}>Billed to</div>
              <div style={{ fontWeight: 700 }}>{invoice.studentName}</div>
              <div style={{ fontSize: 13, color: "var(--slate)" }}>{invoice.studentClass}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--slate)", textTransform: "uppercase" }}>Invoice</div>
              <div className="sm-mono" style={{ fontWeight: 700 }}>{invoice.invoiceNo}</div>
              <div style={{ fontSize: 13, color: "var(--slate)" }}>{fmtDate(invoice.date)}</div>
            </div>
          </div>
          <table className="sm-table" style={{ marginBottom: 14 }}>
            <thead><tr><th>Description</th><th>Method</th><th>Amount</th></tr></thead>
            <tbody>
              <tr>
                <td>Fee payment{invoice.note ? ` — ${invoice.note}` : ""}</td>
                <td>{invoice.method}</td>
                <td className="sm-mono">{currency}{invoice.amount}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="sm-stamp">PAID</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>Total received</div>
              <div className="sm-display" style={{ fontSize: 22 }}>{currency}{invoice.amount}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InvoicesTab({ feeData, school, currency, onOpen }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return feeData.invoices;
    return feeData.invoices.filter((i) => [i.invoiceNo, i.studentName, i.studentClass].join(" ").toLowerCase().includes(term));
  }, [feeData.invoices, q]);
  return (
    <div className="sm-panel">
      <div className="sm-panel-head">
        <div className="sm-search"><Search size={15} color="var(--slate)" /><input placeholder="Search invoice #, student…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {filtered.length === 0 ? <Empty text="No invoices yet — invoices are created automatically when you collect a fee payment." /> : (
        <table className="sm-table">
          <thead><tr><th>Invoice #</th><th>Date</th><th>Student</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {[...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)).map((inv) => (
              <tr key={inv.id}>
                <td className="sm-mono">{inv.invoiceNo}</td>
                <td>{fmtDate(inv.date)}</td>
                <td>{inv.studentName}</td>
                <td className="sm-mono">{currency}{inv.amount}</td>
                <td><span className="sm-pill sm-pill-sage">{inv.status}</span></td>
                <td><button className="sm-icon-btn" onClick={() => onOpen(inv)}><Printer size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------------------------------- Exams & Results ---------------------------------- */

function ExamForm({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [term, setTerm] = useState("");
  const [className, setClassName] = useState("");
  const [subjects, setSubjects] = useState([{ name: "", maxMarks: 100, passMarks: 33 }]);

  function updateSub(i, k, v) { setSubjects((p) => p.map((s, idx) => (idx === i ? { ...s, [k]: v } : s))); }
  function addSub() { setSubjects((p) => [...p, { name: "", maxMarks: 100, passMarks: 33 }]); }
  function removeSub(i) { setSubjects((p) => p.filter((_, idx) => idx !== i)); }

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !className.trim()) return;
    const clean = subjects.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), maxMarks: Number(s.maxMarks) || 100, passMarks: Number(s.passMarks) || 33 }));
    if (clean.length === 0) return;
    onSave({ id: uid(), name: name.trim(), term: term.trim(), className: className.trim(), subjects: clean });
  }

  return (
    <Modal title="Create exam" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="sm-form-grid">
          <Field label="Exam name"><input className="sm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Final Term Exam" autoFocus /></Field>
          <Field label="Term / session"><input className="sm-input" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. 2026 Term 2" /></Field>
          <Field label="Class / Grade" span2><input className="sm-input" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. Grade 5" /></Field>
        </div>
        <div className="sm-divider" />
        <label className="sm-label">Subjects</label>
        {subjects.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="sm-input" placeholder="Subject name" value={s.name} onChange={(e) => updateSub(i, "name", e.target.value)} />
            <input className="sm-input" style={{ maxWidth: 110 }} type="number" placeholder="Max marks" value={s.maxMarks} onChange={(e) => updateSub(i, "maxMarks", e.target.value)} />
            <input className="sm-input" style={{ maxWidth: 110 }} type="number" placeholder="Pass marks" value={s.passMarks} onChange={(e) => updateSub(i, "passMarks", e.target.value)} />
            <button type="button" className="sm-icon-btn" onClick={() => removeSub(i)}><X size={16} /></button>
          </div>
        ))}
        <button type="button" className="sm-btn sm-btn-ghost" onClick={addSub}><Plus size={14} /> Add subject</button>
        <div className="sm-modal-actions">
          <button type="button" className="sm-btn sm-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sm-btn sm-btn-primary"><Check size={16} /> Create exam</button>
        </div>
      </form>
    </Modal>
  );
}

function ExamsTab({ exams, setExams, students }) {
  const [showForm, setShowForm] = useState(false);
  function save(exam) { setExams((p) => [...p, exam]); setShowForm(false); }
  function remove(id) { setExams((p) => p.filter((e) => e.id !== id)); }
  return (
    <div className="sm-panel">
      <div className="sm-panel-head">
        <span style={{ fontSize: 13, color: "var(--slate)" }}>Define exams and their subjects before entering results.</span>
        <button className="sm-btn sm-btn-gold" onClick={() => setShowForm(true)}><Plus size={16} /> Create exam</button>
      </div>
      {exams.length === 0 ? <Empty text="No exams yet." /> : (
        <table className="sm-table">
          <thead><tr><th>Exam</th><th>Term</th><th>Class</th><th>Subjects</th><th></th></tr></thead>
          <tbody>
            {exams.map((ex) => (
              <tr key={ex.id}>
                <td>{ex.name}</td>
                <td>{ex.term || "—"}</td>
                <td>{ex.className}</td>
                <td style={{ color: "var(--slate)" }}>{ex.subjects.map((s) => s.name).join(", ")}</td>
                <td><button className="sm-icon-btn" onClick={() => remove(ex.id)}><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showForm && <ExamForm onSave={save} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function ResultsTab({ exams, students, results, setResults, gradeScale }) {
  const [examId, setExamId] = useState(exams[0]?.id || "");
  const exam = exams.find((e) => e.id === examId);
  const classStudents = exam ? students.filter((s) => s.className.trim().toLowerCase() === exam.className.trim().toLowerCase()) : [];
  const [studentId, setStudentId] = useState("");
  const [marks, setMarks] = useState({});

  useEffect(() => { setExamId(exams[0]?.id || ""); }, [exams.length]);
  useEffect(() => { setStudentId(""); setMarks({}); }, [examId]);

  function openEntry(sId) {
    setStudentId(sId);
    const existing = results.find((r) => r.examId === examId && r.studentId === sId);
    if (existing) {
      const m = {};
      existing.marks.forEach((mk) => { m[mk.subject] = mk.obtained; });
      setMarks(m);
    } else {
      setMarks({});
    }
  }

  function saveMarks() {
    if (!exam || !studentId) return;
    const markRows = exam.subjects.map((sub) => ({ subject: sub.name, obtained: Number(marks[sub.name]) || 0, maxMarks: sub.maxMarks }));
    setResults((prev) => {
      const filtered = prev.filter((r) => !(r.examId === examId && r.studentId === studentId));
      return [...filtered, { id: uid(), examId, studentId, marks: markRows }];
    });
    setStudentId(""); setMarks({});
  }

  const existingResultIds = new Set(results.filter((r) => r.examId === examId).map((r) => r.studentId));

  return (
    <div>
      <div className="sm-panel" style={{ marginBottom: 16 }}>
        <div className="sm-panel-head">
          <Field label="Exam">
            <select className="sm-select" value={examId} onChange={(e) => setExamId(e.target.value)} style={{ minWidth: 240 }}>
              {exams.length === 0 && <option value="">Create an exam first</option>}
              {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name} — {ex.className}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {exam && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
          <div className="sm-panel">
            <div className="sm-panel-head"><span style={{ fontSize: 13, fontWeight: 700 }}>{exam.className} students</span></div>
            {classStudents.length === 0 ? <Empty text="No students in this class." /> : (
              <div>
                {classStudents.map((s) => (
                  <button key={s.id} onClick={() => openEntry(s.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                      padding: "10px 18px", border: "none", borderBottom: "1px solid var(--line)", background: studentId === s.id ? "var(--paper)" : "#fff",
                      cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, textAlign: "left"
                    }}>
                    <span>{s.name}</span>
                    {existingResultIds.has(s.id) ? <span className="sm-pill sm-pill-sage">Entered</span> : <ChevronRight size={14} color="var(--slate)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sm-panel">
            <div className="sm-panel-head"><span style={{ fontSize: 13, fontWeight: 700 }}>{studentId ? `Marks for ${classStudents.find((s) => s.id === studentId)?.name}` : "Select a student"}</span></div>
            {studentId ? (
              <div style={{ padding: 18 }}>
                {exam.subjects.map((sub) => (
                  <Field key={sub.name} label={`${sub.name} (out of ${sub.maxMarks})`}>
                    <input className="sm-input" type="number" min="0" max={sub.maxMarks} value={marks[sub.name] ?? ""} onChange={(e) => setMarks((p) => ({ ...p, [sub.name]: e.target.value }))} />
                  </Field>
                ))}
                <button className="sm-btn sm-btn-primary" onClick={saveMarks}><Check size={16} /> Save marks</button>
              </div>
            ) : <Empty text="Choose a student on the left to enter or edit marks." />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Gradesheets ---------------------------------- */

function computeReport(exam, student, result, gradeScale) {
  const rows = exam.subjects.map((sub) => {
    const m = result?.marks.find((mk) => mk.subject === sub.name);
    const obtained = m ? m.obtained : 0;
    const pct = sub.maxMarks ? (obtained / sub.maxMarks) * 100 : 0;
    const g = gradeFor(pct, gradeScale);
    return { subject: sub.name, maxMarks: sub.maxMarks, obtained, pct, grade: g.grade, pass: obtained >= sub.passMarks };
  });
  const totalMax = exam.subjects.reduce((s, sub) => s + sub.maxMarks, 0);
  const totalObtained = rows.reduce((s, r) => s + r.obtained, 0);
  const overallPct = totalMax ? (totalObtained / totalMax) * 100 : 0;
  const overall = gradeFor(overallPct, gradeScale);
  const allPass = rows.every((r) => r.pass);
  return { rows, totalMax, totalObtained, overallPct, overall, allPass };
}

function GradesheetDoc({ exam, student, report, school, onClose }) {
  return (
    <Modal title="" onClose={onClose} wide>
      <div className="sm-no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <button className="sm-btn sm-btn-gold" onClick={() => window.print()}><Printer size={15} /> Print</button>
      </div>
      <div className="sm-print-area">
        <div className="sm-print-doc">
          <div className="sm-print-head">
            <div>
              <div className="sm-display" style={{ fontSize: 20 }}>{school.name || "Your School"}</div>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>Grade Sheet — {exam.name}{exam.term ? ` (${exam.term})` : ""}</div>
            </div>
            <div className="sm-print-seal">{(school.name || "S").trim()[0]?.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--slate)", textTransform: "uppercase" }}>Student</div>
              <div style={{ fontWeight: 700 }}>{student.name}</div>
              <div style={{ fontSize: 13, color: "var(--slate)" }}>{student.className}{student.rollNo ? ` · Roll ${student.rollNo}` : ""}</div>
            </div>
          </div>
          <table className="sm-table" style={{ marginBottom: 14 }}>
            <thead><tr><th>Subject</th><th>Max</th><th>Obtained</th><th>%</th><th>Grade</th></tr></thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.subject}>
                  <td>{r.subject}</td>
                  <td className="sm-mono">{r.maxMarks}</td>
                  <td className="sm-mono">{r.obtained}</td>
                  <td className="sm-mono">{r.pct.toFixed(1)}%</td>
                  <td><span className={"sm-pill " + (r.pass ? "sm-pill-sage" : "sm-pill-rust")}>{r.grade}</span></td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td className="sm-mono" style={{ fontWeight: 700 }}>{report.totalMax}</td>
                <td className="sm-mono" style={{ fontWeight: 700 }}>{report.totalObtained}</td>
                <td className="sm-mono" style={{ fontWeight: 700 }}>{report.overallPct.toFixed(1)}%</td>
                <td><span className={"sm-pill " + (report.allPass ? "sm-pill-sage" : "sm-pill-rust")}>{report.overall.grade}</span></td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className={"sm-stamp" + (report.allPass ? "" : " sm-stamp-due")}>{report.allPass ? "PASS" : "NEEDS ATTENTION"}</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--slate)" }}>{report.overall.remark}</div>
              <div className="sm-display" style={{ fontSize: 22 }}>{report.overall.grade}</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function GradesheetsTab({ exams, students, results, gradeScale, school }) {
  const [examId, setExamId] = useState(exams[0]?.id || "");
  const [studentId, setStudentId] = useState("");
  const [doc, setDoc] = useState(null);
  const exam = exams.find((e) => e.id === examId);
  const classStudents = exam ? students.filter((s) => s.className.trim().toLowerCase() === exam.className.trim().toLowerCase()) : [];

  useEffect(() => { setExamId(exams[0]?.id || ""); }, [exams.length]);
  useEffect(() => { setStudentId(""); }, [examId]);

  function view(sId) {
    const student = classStudents.find((s) => s.id === sId);
    const result = results.find((r) => r.examId === examId && r.studentId === sId);
    const report = computeReport(exam, student, result, gradeScale);
    setDoc({ student, report });
  }

  return (
    <div>
      <div className="sm-panel" style={{ marginBottom: 16 }}>
        <div className="sm-panel-head">
          <Field label="Exam">
            <select className="sm-select" value={examId} onChange={(e) => setExamId(e.target.value)} style={{ minWidth: 240 }}>
              {exams.length === 0 && <option value="">Create an exam first</option>}
              {exams.map((ex) => <option key={ex.id} value={ex.id}>{ex.name} — {ex.className}</option>)}
            </select>
          </Field>
        </div>
      </div>
      {exam && (
        <div className="sm-panel">
          {classStudents.length === 0 ? <Empty text="No students in this class." /> : (
            <table className="sm-table">
              <thead><tr><th>Student</th><th>Result status</th><th></th></tr></thead>
              <tbody>
                {classStudents.map((s) => {
                  const has = results.some((r) => r.examId === examId && r.studentId === s.id);
                  return (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{has ? <span className="sm-pill sm-pill-sage">Marks entered</span> : <span className="sm-pill sm-pill-gold">No marks yet</span>}</td>
                      <td><button className="sm-btn sm-btn-ghost" style={{ padding: "5px 12px", fontSize: 12.5 }} onClick={() => view(s.id)}><Printer size={13} /> Gradesheet</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {doc && <GradesheetDoc exam={exam} student={doc.student} report={doc.report} school={school} onClose={() => setDoc(null)} />}
    </div>
  );
}

/* ---------------------------------- Settings ---------------------------------- */

function SettingsTab({ school, setSchool, gradeScale, setGradeScale }) {
  const [name, setName] = useState(school.name);
  const [address, setAddress] = useState(school.address);
  const [currency, setCurrency] = useState(school.currency);
  const [saved, setSaved] = useState(false);

  function save(e) {
    e.preventDefault();
    setSchool({ name, address, currency });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function updateGrade(i, k, v) {
    setGradeScale((p) => p.map((g, idx) => (idx === i ? { ...g, [k]: k === "min" ? Number(v) : v } : g)));
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="sm-panel" style={{ padding: 20, marginBottom: 20 }}>
        <h3 className="sm-display" style={{ marginTop: 0, fontSize: 17 }}>School details</h3>
        <form onSubmit={save}>
          <Field label="School name"><input className="sm-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Address"><input className="sm-input" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <Field label="Currency symbol"><input className="sm-input" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ maxWidth: 120 }} /></Field>
          <button className="sm-btn sm-btn-primary">{saved ? <><Check size={16} /> Saved</> : "Save changes"}</button>
        </form>
      </div>
      <div className="sm-panel" style={{ padding: 20 }}>
        <h3 className="sm-display" style={{ marginTop: 0, fontSize: 17 }}>Grade scale</h3>
        <p className="sm-note" style={{ marginBottom: 14 }}>Used to compute grades on gradesheets. Minimum percentage for each grade.</p>
        {gradeScale.map((g, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input className="sm-input" style={{ maxWidth: 90 }} type="number" value={g.min} onChange={(e) => updateGrade(i, "min", e.target.value)} />
            <span style={{ fontSize: 12, color: "var(--slate)" }}>% and above →</span>
            <input className="sm-input" style={{ maxWidth: 70 }} value={g.grade} onChange={(e) => updateGrade(i, "grade", e.target.value)} />
            <input className="sm-input" value={g.remark} onChange={(e) => updateGrade(i, "remark", e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- App shell ---------------------------------- */

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: ClipboardList },
  { key: "students", label: "Students", icon: Users },
  { key: "fees", label: "Fees", icon: Wallet },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "exams", label: "Exams", icon: FileText },
  { key: "results", label: "Results", icon: GraduationCap },
  { key: "gradesheets", label: "Gradesheets", icon: GraduationCap },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function MainApp({ onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [school, setSchoolState] = useState({ name: "", address: "", currency: "Rs." });
  const [students, setStudentsState] = useState([]);
  const [feeData, setFeeDataState] = useState({ feeStructures: [], payments: [], invoices: [], nextInvoiceNo: 1 });
  const [academics, setAcademicsState] = useState({ exams: [], results: [], gradeScale: DEFAULT_GRADE_SCALE });
  const [invoiceView, setInvoiceView] = useState(null);
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    (async () => {
      const [s, st, fd, ac, a] = await Promise.all([
        loadJSON("school-info", { name: "", address: "", currency: "Rs." }),
        loadJSON("students", []),
        loadJSON("fees-data", { feeStructures: [], payments: [], invoices: [], nextInvoiceNo: 1 }),
        loadJSON("academics-data", { exams: [], results: [], gradeScale: DEFAULT_GRADE_SCALE }),
        loadJSON("auth", null),
      ]);
      setSchoolState(s); setStudentsState(st); setFeeDataState(fd); setAcademicsState(ac); setAuth(a);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) saveJSON("school-info", school); }, [school, loaded]);
  useEffect(() => { if (loaded) saveJSON("students", students); }, [students, loaded]);
  useEffect(() => { if (loaded) saveJSON("fees-data", feeData); }, [feeData, loaded]);
  useEffect(() => { if (loaded) saveJSON("academics-data", academics); }, [academics, loaded]);

  const setExams = (updater) => setAcademicsState((p) => ({ ...p, exams: typeof updater === "function" ? updater(p.exams) : updater }));
  const setResults = (updater) => setAcademicsState((p) => ({ ...p, results: typeof updater === "function" ? updater(p.results) : updater }));
  const setGradeScale = (updater) => setAcademicsState((p) => ({ ...p, gradeScale: typeof updater === "function" ? updater(p.gradeScale) : updater }));

  if (!loaded) return <div className="sm-auth-wrap"><p style={{ color: "var(--slate)" }}>Loading your school's data…</p></div>;

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "Active").length;
  const totalCollected = feeData.payments.reduce((s, p) => s + p.amount, 0);
  const totalDue = students.reduce((sum, s) => {
    const structure = feeData.feeStructures.find((f) => f.className.trim().toLowerCase() === s.className.trim().toLowerCase());
    if (!structure) return sum;
    const paid = feeData.payments.filter((p) => p.studentId === s.id).reduce((a, p) => a + p.amount, 0);
    return sum + Math.max(structure.total - paid, 0);
  }, 0);
  const upcomingExams = academics.exams.length;

  return (
    <div className="sm-shell">
      <aside className="sm-sidebar sm-no-print">
        <div className="sm-brand">
          <div className="sm-brand-seal"><School size={17} color="#1B2A4A" /></div>
          <div className="sm-brand-name">{school.name || "Your School"}</div>
        </div>
        <nav className="sm-nav">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} className={"sm-tab" + (tab === t.key ? " active" : "")} onClick={() => setTab(t.key)}>
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </nav>
        <div className="sm-sidebar-foot">
          <div className="sm-user-row">
            <span>{auth?.username}</span>
            <button className="sm-icon-btn" style={{ color: "#CBD3E0" }} onClick={onLogout}><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <main className="sm-main">
        <div className="sm-topbar sm-no-print">
          <div>
            <h1 className="sm-page-title sm-display">{TABS.find((t) => t.key === tab)?.label}</h1>
            <p className="sm-page-sub">{school.name || "Your School"}</p>
          </div>
        </div>
        <div className="sm-content">
          {tab === "dashboard" && (
            <div>
              <div className="sm-stat-grid">
                <div className="sm-stat"><div className="sm-stat-label">Total students</div><div className="sm-stat-value sm-display">{totalStudents}</div></div>
                <div className="sm-stat"><div className="sm-stat-label">Active students</div><div className="sm-stat-value sm-display">{activeStudents}</div></div>
                <div className="sm-stat"><div className="sm-stat-label">Fees collected</div><div className="sm-stat-value sm-display">{school.currency}{totalCollected}</div></div>
                <div className="sm-stat"><div className="sm-stat-label">Fees due</div><div className="sm-stat-value sm-display" style={{ color: totalDue > 0 ? "var(--rust)" : undefined }}>{school.currency}{totalDue}</div></div>
              </div>
              <div className="sm-panel" style={{ padding: 22 }}>
                <h3 className="sm-display" style={{ marginTop: 0 }}>Getting started</h3>
                <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.6 }}>
                  1. Add your students in the <strong>Students</strong> tab.<br />
                  2. Set fee amounts per class in <strong>Fees → Fee structure</strong>.<br />
                  3. Collect payments — invoices are generated automatically and printable from <strong>Invoices</strong>.<br />
                  4. Create an exam in <strong>Exams</strong>, enter marks in <strong>Results</strong>, and print report cards from <strong>Gradesheets</strong>.
                </p>
              </div>
            </div>
          )}
          {tab === "students" && <StudentsTab students={students} setStudents={setStudentsState} />}
          {tab === "fees" && <FeesTab students={students} feeData={feeData} setFeeData={setFeeDataState} currency={school.currency} onOpenInvoice={setInvoiceView} />}
          {tab === "invoices" && <InvoicesTab feeData={feeData} school={school} currency={school.currency} onOpen={setInvoiceView} />}
          {tab === "exams" && <ExamsTab exams={academics.exams} setExams={setExams} students={students} />}
          {tab === "results" && <ResultsTab exams={academics.exams} students={students} results={academics.results} setResults={setResults} gradeScale={academics.gradeScale} />}
          {tab === "gradesheets" && <GradesheetsTab exams={academics.exams} students={students} results={academics.results} gradeScale={academics.gradeScale} school={school} />}
          {tab === "settings" && <SettingsTab school={school} setSchool={setSchoolState} gradeScale={academics.gradeScale} setGradeScale={setGradeScale} />}
        </div>
      </main>
      {invoiceView && <InvoiceDoc invoice={invoiceView} school={school} currency={school.currency} onClose={() => setInvoiceView(null)} />}
    </div>
  );
}

/* ---------------------------------- Root ---------------------------------- */

export default function SchoolManager() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <div className="sm-root">
      <Style />
      {loggedIn ? (
        <MainApp key={key} onLogout={() => setLoggedIn(false)} />
      ) : (
        <AuthGate onReady={() => setLoggedIn(true)} />
      )}
    </div>
  );
}
