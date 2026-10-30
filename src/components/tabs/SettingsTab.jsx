import React, { useState } from "react";
import { Check } from "lucide-react";
import { Field } from "../Shared";
import { api } from "../../api/client";
import { DEFAULT_GRADE_SCALE, normalizeImageUrl } from "../../utils/helpers";

export default function SettingsTab({ school, setSchool, gradeScale, setGradeScale, token }) {
  const [name, setName] = useState(school.name);
  const [address, setAddress] = useState(school.address);
  const [currency, setCurrency] = useState(school.currency);
  const [logoUrl, setLogoUrl] = useState(school.logoUrl || "");
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    try {
      const data = await api("/schools/me", {
        method: "PUT",
        body: { name, address, currency, logo_url: normalizeImageUrl(logoUrl) },
        token,
      });
      const schoolData = data.school || {};
      setSchool((prev) => ({
        ...prev,
        name: schoolData.name || name,
        address: schoolData.address || address,
        currency: schoolData.currency || currency,
        logoUrl: normalizeImageUrl(schoolData.logo_url || schoolData.logoUrl || logoUrl),
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      console.error(e);
    }
  }

  function updateGrade(i, k, v) {
    setGradeScale((p) => p.map((g, idx) => (idx === i ? { ...g, [k]: ["min", "gradePoint"].includes(k) ? Number(v) : v } : g)));
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="sm-panel" style={{ padding: 20, marginBottom: 20 }}>
        <h3 className="sm-display" style={{ marginTop: 0, fontSize: 17 }}>School details</h3>
        <form onSubmit={save}>
          <Field label="School name"><input className="sm-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Address"><input className="sm-input" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <Field label="Currency symbol"><input className="sm-input" value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ maxWidth: 120 }} /></Field>
          <Field label="Logo URL"><input className="sm-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" /></Field>
          <button className="sm-btn sm-btn-primary">{saved ? <><Check size={16} /> Saved</> : "Save changes"}</button>
        </form>
      </div>
      <div className="sm-panel" style={{ padding: 20 }}>
        <h3 className="sm-display" style={{ marginTop: 0, fontSize: 17 }}>Grade scale</h3>
        <p className="sm-note" style={{ marginBottom: 14 }}>Set the minimum percentage and grade-point value for each letter grade.</p>
        <div style={{ display: "grid", gridTemplateColumns: "76px 62px minmax(100px, 1fr) 80px", gap: 8, marginBottom: 8, color: "var(--slate)", fontSize: 11, fontWeight: 700 }}>
          <span>Minimum %</span><span>Grade</span><span>Remark</span><span>Grade point</span>
        </div>
        {gradeScale.map((g, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "76px 62px minmax(100px, 1fr) 80px", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input className="sm-input" type="number" value={g.min} onChange={(e) => updateGrade(i, "min", e.target.value)} />
            <input className="sm-input" value={g.grade} onChange={(e) => updateGrade(i, "grade", e.target.value)} />
            <input className="sm-input" value={g.remark} onChange={(e) => updateGrade(i, "remark", e.target.value)} />
            <input className="sm-input" type="number" min="0" step="0.1" value={g.gradePoint ?? DEFAULT_GRADE_SCALE.find((row) => row.grade === g.grade)?.gradePoint ?? 0} onChange={(e) => updateGrade(i, "gradePoint", e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}
