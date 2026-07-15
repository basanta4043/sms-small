import React, { useState } from "react";
import { Check } from "lucide-react";
import { Field } from "../Shared";
import { api } from "../../api/client";
import { normalizeImageUrl } from "../../utils/helpers";

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
          <Field label="Logo URL"><input className="sm-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" /></Field>
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
