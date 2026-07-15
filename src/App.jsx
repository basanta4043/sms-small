import React, { useEffect, useState } from "react";
import {
  ClipboardList, Users, Wallet, Receipt, FileText, GraduationCap,
  Settings as SettingsIcon, LogOut, School
} from "lucide-react";
import AuthGate from "./components/AuthGate";
import LandingPage from "./components/LandingPage";
import { Style } from "./components/Shared";
import StudentsTab from "./components/tabs/StudentsTab";
import FeesTab, { InvoiceDoc } from "./components/tabs/FeesTab";
import InvoicesTab from "./components/tabs/InvoicesTab";
import ExamsTab from "./components/tabs/ExamsTab";
import ResultsTab from "./components/tabs/ResultsTab";
import GradesheetsTab from "./components/tabs/GradesheetsTab";
import SettingsTab from "./components/tabs/SettingsTab";
import { DEFAULT_GRADE_SCALE, camelizeKeys, getDriveImageCandidates, normalizeImageUrl } from "./utils/helpers";
import { loadJSON, saveJSON } from "./utils/storage";

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

const TAB_KEYS = TABS.map((tab) => tab.key);

function getTabFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#\/?/, "").trim();
  return TAB_KEYS.includes(hash) ? hash : null;
}

function getRouteFromPath(pathname = window.location.pathname) {
  if (typeof window === "undefined") return "landing";
  const normalized = (pathname || "/").replace(/\/+$/, "") || "/";
  if (normalized === "/login") return "login";
  if (normalized === "/dashboard") return "dashboard";
  return "landing";
}

function setTabHash(tabKey) {
  if (typeof window === "undefined") return;
  const nextHash = tabKey === "dashboard" ? "" : `/${tabKey}`;
  const target = `${window.location.pathname}${nextHash ? `#${nextHash}` : ""}`;
  if (window.location.pathname + window.location.hash !== target) {
    window.history.replaceState(null, "", target);
  }
}

function navigateTo(path) {
  if (typeof window === "undefined") return;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (window.location.pathname !== normalizedPath) {
    window.history.pushState(null, "", normalizedPath);
  }
}

function SchoolLogoImage({ src, alt, style }) {
  const [attempt, setAttempt] = useState(0);
  const [hasError, setHasError] = useState(false);
  const candidates = getDriveImageCandidates(src);

  useEffect(() => {
    setAttempt(0);
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return <School size={17} color="#1B2A4A" />;
  }

  return (
    <img
      src={candidates[attempt] || src}
      alt={alt}
      style={style}
      referrerPolicy="no-referrer"
      onError={() => {
        if (attempt + 1 < candidates.length) {
          setAttempt((current) => current + 1);
        } else {
          setHasError(true);
        }
      }}
    />
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(window.localStorage.getItem("sm_token")));
  const [route, setRoute] = useState(() => getRouteFromPath());
  const [tab, setTab] = useState(() => getTabFromHash() || window.localStorage.getItem("sm_active_tab") || "dashboard");
  const [loaded, setLoaded] = useState(false);
  const [school, setSchoolState] = useState({ name: "", address: "", currency: "Rs.", logoUrl: "" });
  const [students, setStudentsState] = useState([]);
  const [feeData, setFeeDataState] = useState({ feeStructures: [], payments: [], invoices: [], nextInvoiceNo: 1 });
  const [academics, setAcademicsState] = useState({ exams: [], results: [], gradeScale: DEFAULT_GRADE_SCALE });
  const [invoiceView, setInvoiceView] = useState(null);
  const [auth, setAuth] = useState(null);
  const [token, setToken] = useState(() => window.localStorage.getItem("sm_token"));

  useEffect(() => {
    const handlePopState = () => setRoute(getRouteFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const tokenValue = window.localStorage.getItem("sm_token");
    if (route === "dashboard" && !tokenValue) {
      navigateTo("/login");
      setRoute("login");
      return;
    }
    if ((route === "landing" || route === "login") && tokenValue) {
      navigateTo("/dashboard");
      setRoute("dashboard");
    }
  }, [loaded, route]);

  useEffect(() => {
    (async () => {
      const [s, st, fd, ac] = await Promise.all([
        loadJSON("school-info", { name: "", address: "", currency: "Rs.", logoUrl: "" }),
        loadJSON("students", []),
        loadJSON("fees-data", { feeStructures: [], payments: [], invoices: [], nextInvoiceNo: 1 }),
        loadJSON("academics-data", { exams: [], results: [], gradeScale: DEFAULT_GRADE_SCALE }),
      ]);
      setSchoolState({ ...s, logoUrl: normalizeImageUrl(s?.logoUrl || "") });
      setStudentsState(Array.isArray(st) ? st.map(camelizeKeys) : []);
      const feeState = fd || { feeStructures: [], payments: [], invoices: [], nextInvoiceNo: 1 };
      setFeeDataState({
        ...feeState,
        feeStructures: Array.isArray(feeState.feeStructures) ? feeState.feeStructures.map(camelizeKeys) : [],
        payments: Array.isArray(feeState.payments) ? feeState.payments.map(camelizeKeys) : [],
        invoices: Array.isArray(feeState.invoices) ? feeState.invoices.map(camelizeKeys) : [],
      });
      setAcademicsState(ac);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || !token) return;
    (async () => {
      try {
        const { api } = await import("./api/client");
        const authData = await api("/auth/me", { token });
        const schoolData = camelizeKeys(authData.school || {});
        setAuth(authData.user);
        setLoggedIn(true);
        setSchoolState((prev) => ({
          ...prev,
          name: schoolData.name || prev.name || "",
          address: schoolData.address || prev.address || "",
          currency: schoolData.currency || prev.currency || "Rs.",
          logoUrl: normalizeImageUrl(schoolData.logoUrl || prev.logoUrl || ""),
        }));

        switch (tab) {
          case "students": {
            const studentsData = await api("/students", { token });
            const students = (studentsData.students || []).map(camelizeKeys);
            setStudentsState(students);
            break;
          }
          case "fees": {
            const [studentsData, structuresData, paymentsData, invoicesData] = await Promise.all([
              api("/students", { token }),
              api("/fees/structures", { token }),
              api("/fees/payments", { token }),
              api("/fees/invoices", { token }),
            ]);
            const students = (studentsData.students || []).map(camelizeKeys);
            const feeStructures = (structuresData.feeStructures || []).map(camelizeKeys);
            const payments = (paymentsData.payments || []).map(camelizeKeys);
            const invoiceList = (invoicesData.invoices || []).map(camelizeKeys);
            const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
            const invoices = invoiceList.map((invoice) => ({
              ...invoice,
              studentName: invoice.studentName || studentMap[invoice.studentId]?.name || "—",
              studentClass: invoice.studentClass || studentMap[invoice.studentId]?.className || "—",
            }));
            setStudentsState(students);
            setFeeDataState({
              feeStructures,
              payments,
              invoices,
              nextInvoiceNo: 1,
            });
            break;
          }
          case "invoices": {
            const [studentsData, paymentsData, invoicesData] = await Promise.all([
              api("/students", { token }),
              api("/fees/payments", { token }),
              api("/fees/invoices", { token }),
            ]);
            const students = (studentsData.students || []).map(camelizeKeys);
            const payments = (paymentsData.payments || []).map(camelizeKeys);
            const invoiceList = (invoicesData.invoices || []).map(camelizeKeys);
            const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
            const invoices = invoiceList.map((invoice) => ({
              ...invoice,
              studentName: invoice.studentName || studentMap[invoice.studentId]?.name || "—",
              studentClass: invoice.studentClass || studentMap[invoice.studentId]?.className || "—",
            }));
            setStudentsState(students);
            setFeeDataState((prev) => ({ ...prev, payments, invoices, nextInvoiceNo: prev.nextInvoiceNo || 1 }));
            break;
          }
          case "exams": {
            const examsData = await api("/exams", { token });
            const exams = (examsData.exams || []).map(camelizeKeys);
            setAcademicsState((prev) => ({ ...prev, exams, gradeScale: prev.gradeScale || DEFAULT_GRADE_SCALE }));
            break;
          }
          case "results": {
            const [studentsData, examsData, resultsData] = await Promise.all([
              api("/students", { token }),
              api("/exams", { token }),
              api("/results", { token }),
            ]);
            const students = (studentsData.students || []).map(camelizeKeys);
            const exams = (examsData.exams || []).map(camelizeKeys);
            const results = (resultsData.results || []).map(camelizeKeys);
            setStudentsState(students);
            setAcademicsState((prev) => ({ ...prev, exams, results, gradeScale: prev.gradeScale || DEFAULT_GRADE_SCALE }));
            break;
          }
          case "gradesheets": {
            const [studentsData, examsData, resultsData] = await Promise.all([
              api("/students", { token }),
              api("/exams", { token }),
              api("/results", { token }),
            ]);
            const students = (studentsData.students || []).map(camelizeKeys);
            const exams = (examsData.exams || []).map(camelizeKeys);
            const results = (resultsData.results || []).map(camelizeKeys);
            setStudentsState(students);
            setAcademicsState((prev) => ({ ...prev, exams, results, gradeScale: prev.gradeScale || DEFAULT_GRADE_SCALE }));
            break;
          }
          default:
            break;
        }
      } catch (e) {
        window.localStorage.removeItem("sm_token");
        setToken(null);
      }
    })();
  }, [loaded, token, tab]);

  useEffect(() => { if (loaded) saveJSON("school-info", school); }, [school, loaded]);
  useEffect(() => { if (loaded) saveJSON("students", students); }, [students, loaded]);
  useEffect(() => { if (loaded) saveJSON("fees-data", feeData); }, [feeData, loaded]);
  useEffect(() => { if (loaded) saveJSON("academics-data", academics); }, [academics, loaded]);
  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem("sm_active_tab", tab);
    if (route === "dashboard") {
      setTabHash(tab);
    }
  }, [tab, loaded, route]);

  const setExams = (updater) => setAcademicsState((p) => ({ ...p, exams: typeof updater === "function" ? updater(p.exams) : updater }));
  const setResults = (updater) => setAcademicsState((p) => ({ ...p, results: typeof updater === "function" ? updater(p.results) : updater }));
  const setGradeScale = (updater) => setAcademicsState((p) => ({ ...p, gradeScale: typeof updater === "function" ? updater(p.gradeScale) : updater }));

  const handleLoginReady = (user, tokenValue, schoolData) => {
    const normalizedSchool = camelizeKeys(schoolData || {});
    setAuth(user || null);
    setLoggedIn(true);
    setToken(tokenValue);
    setSchoolState((prev) => ({
      ...prev,
      name: normalizedSchool.name || prev.name || "",
      address: normalizedSchool.address || prev.address || "",
      currency: normalizedSchool.currency || prev.currency || "Rs.",
      logoUrl: normalizeImageUrl(normalizedSchool.logoUrl || prev.logoUrl || ""),
    }));
    window.localStorage.setItem("sm_token", tokenValue);
    navigateTo("/dashboard");
    setRoute("dashboard");
  };

  const handleLogout = () => {
    window.localStorage.removeItem("sm_token");
    setAuth(null);
    setLoggedIn(false);
    setToken(null);
    navigateTo("/login");
    setRoute("login");
  };

  if (route === "landing") {
    return (
      <div className="sm-root">
        <Style />
        <LandingPage onEnter={() => {
          navigateTo("/login");
          setRoute("login");
        }} />
      </div>
    );
  }

  if (route === "login") {
    return (
      <div className="sm-root">
        <Style />
        <AuthGate onReady={handleLoginReady} />
      </div>
    );
  }

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

  return (
    <div className="sm-root">
      <Style />
      {loggedIn ? (
        <div className="sm-shell">
          <aside className="sm-sidebar sm-no-print">
            <div className="sm-brand">
              <div className="sm-brand-seal" style={{ overflow: "hidden", padding: 0 }}>
                <SchoolLogoImage src={school.logoUrl} alt="School logo" style={{ width: 34, height: 34, objectFit: "cover" }} />
              </div>
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
                <button className="sm-icon-btn" style={{ color: "#CBD3E0" }} onClick={handleLogout}><LogOut size={15} /></button>
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
              {tab === "students" && <StudentsTab students={students} setStudents={setStudentsState} token={token} />}
              {tab === "fees" && <FeesTab students={students} feeData={feeData} setFeeData={setFeeDataState} currency={school.currency} token={token} onOpenInvoice={setInvoiceView} />}
              {tab === "invoices" && <InvoicesTab feeData={feeData} school={school} currency={school.currency} onOpen={setInvoiceView} />}
              {tab === "exams" && <ExamsTab exams={academics.exams} setExams={setExams} token={token} />}
              {tab === "results" && <ResultsTab exams={academics.exams} students={students} results={academics.results} setResults={setResults} token={token} />}
              {tab === "gradesheets" && <GradesheetsTab exams={academics.exams} students={students} results={academics.results} gradeScale={academics.gradeScale} school={school} token={token} />}
              {tab === "settings" && <SettingsTab school={school} setSchool={setSchoolState} gradeScale={academics.gradeScale} setGradeScale={setGradeScale} token={token} />}
            </div>
          </main>
          {invoiceView && <InvoiceDoc invoice={invoiceView} school={school} currency={school.currency} onClose={() => setInvoiceView(null)} />}
        </div>
      ) : (
        <AuthGate onReady={handleLoginReady} />
      )}
    </div>
  );
}
