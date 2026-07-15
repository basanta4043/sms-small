import React, { useEffect, useState } from "react";
import { School, Lock, UserPlus } from "lucide-react";
import { Field } from "./Shared";
import { api } from "../api/client";
import { camelizeKeys } from "../utils/helpers";

export default function AuthGate({ onReady }) {
  const [phase, setPhase] = useState("loading");
  const [schoolName, setSchoolName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("sm_token");
    setPhase(token ? "login" : "login");
  }, []);

  function switchPhase(nextPhase) {
    setErr("");
    setPassword("");
    setPassword2("");
    setPhase(nextPhase);
  }

  async function handleSetup(e) {
    e.preventDefault();
    setErr("");
    if (!schoolName.trim()) return setErr("Please enter your school's name.");
    if (!username.trim()) return setErr("Choose an admin username.");
    if (password.length < 4) return setErr("Password should be at least 4 characters.");
    if (password !== password2) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: { username: username.trim(), password, school_name: schoolName.trim() },
      });
      window.localStorage.setItem("sm_token", data.access_token);
      onReady(data.user, data.access_token, camelizeKeys(data.school || {}));
    } catch (e) {
      setErr(e.message || "Unable to create the account right now.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { username: username.trim(), password },
      });
      window.localStorage.setItem("sm_token", data.access_token);
      onReady(data.user, data.access_token, camelizeKeys(data.school || {}));
    } catch (e) {
      setErr(e.message || "Incorrect username or password.");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "loading") return <div className="sm-auth-wrap"><p style={{ color: "var(--slate)" }}>Loading…</p></div>;

  if (phase === "setup") {
    return (
      <div className="sm-auth-wrap">
        <div className="sm-auth-card">
          <div className="sm-seal"><School size={26} /></div>
          <div className="sm-auth-toggle" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" className="sm-btn" style={{ flex: 1 }} onClick={() => switchPhase("login")}>Log in</button>
            <button type="button" className="sm-btn sm-btn-gold" style={{ flex: 1 }} onClick={() => switchPhase("setup")}>Create account</button>
          </div>
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
        <div className="sm-auth-toggle" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button type="button" className="sm-btn sm-btn-gold" style={{ flex: 1 }} onClick={() => switchPhase("login")}>Log in</button>
          <button type="button" className="sm-btn" style={{ flex: 1 }} onClick={() => switchPhase("setup")}>Create account</button>
        </div>
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
