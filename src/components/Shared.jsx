import React from "react";
import { X } from "lucide-react";

export const Style = () => (
  <style>{`
    body{ margin:0; }
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

    .sm-root{ min-height:100vh; }
    .sm-shell{ display:flex; min-height:100vh; }
    .sm-sidebar{
      width: 218px; background: var(--ink); color: #EFE7D6; padding: 22px 0;
      display:flex; flex-direction:column; flex-shrink:0; min-height:100vh;
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

    .sm-main{ flex:1; background: var(--paper); min-width:0; min-height:100vh; }
    .sm-topbar{
      display:flex; align-items:center; justify-content:space-between;
      padding: 18px 28px; border-bottom: 1px solid var(--line);
    }
    .sm-page-title{ font-size: 21px; margin:0; }
    .sm-page-sub{ color: var(--slate); font-size: 12.5px; margin-top:2px;}
    .sm-content{ padding: 22px 28px 40px; }

    .sm-stat-grid{ display:grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 22px;}
    .sm-stat{ background: var(--card); border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
    .sm-stat-label{ font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--slate); font-weight:600;}
    .sm-stat-value{ font-family:'Fraunces',serif; font-size:26px; margin-top:6px; }

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

    .sm-modal-overlay{ position:fixed; inset:0; background: rgba(27,42,74,0.45); display:flex; align-items:flex-start; justify-content:center; z-index:50; padding: 40px 16px; overflow:auto;}
    .sm-modal{ background: var(--card); border-radius: 14px; width:100%; max-width:520px; padding: 26px 28px 28px; box-shadow: 0 30px 60px -20px rgba(0,0,0,0.4);}
    .sm-modal-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 18px;}
    .sm-modal-title{ font-size: 19px; margin:0;}
    .sm-form-grid{ display:grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .sm-form-grid .span2{ grid-column: 1 / -1; }
    .sm-modal-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top: 18px; }
    .sm-divider{ height:1px; background: var(--line); margin: 18px 0; }
    .sm-note{ font-size:12.5px; color:var(--slate); margin-top:4px;}

    .sm-subtabs{ display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap;}
    .sm-subtab{ padding:7px 14px; border-radius:8px 8px 0 0; border:1px solid var(--line); border-bottom:none; background:var(--paper); color:var(--slate); font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; position:relative; top:1px;}
    .sm-subtab.active{ background:var(--card); color:var(--ink); border-color:var(--line); box-shadow: 0 -2px 0 var(--marigold) inset;}

    .sm-landing-shell{ min-height:100vh; padding: 28px 20px 40px; background:
      radial-gradient(circle at 15% 20%, rgba(201,138,43,0.12), transparent 38%),
      radial-gradient(circle at 85% 80%, rgba(79,122,92,0.14), transparent 36%),
      var(--paper); }
    .sm-landing-hero{ max-width: 1180px; margin: 0 auto; display:grid; grid-template-columns: 1.4fr .9fr; gap: 24px; align-items:center; }
    .sm-landing-copy h1{ font-size: clamp(2rem, 4vw, 3.35rem); margin: 10px 0 12px; line-height:1.06; }
    .sm-landing-copy p{ font-size: 1rem; line-height: 1.75; color: var(--slate); max-width: 700px; }
    .sm-landing-badge{ display:inline-flex; padding: 6px 10px; border-radius: 999px; background: var(--marigold-soft); color: #7C5A1A; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .sm-landing-actions{ display:flex; gap: 12px; flex-wrap:wrap; margin: 20px 0 24px; }
    .sm-landing-stats{ display:grid; grid-template-columns: repeat(3, minmax(90px, 1fr)); gap: 12px; max-width: 560px; }
    .sm-landing-stats div{ background: rgba(255,255,255,0.8); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
    .sm-landing-stats strong{ display:block; font-size: 1rem; color: var(--ink); }
    .sm-landing-stats span{ display:block; color: var(--slate); font-size: 12px; margin-top: 4px; }
    .sm-landing-card, .sm-landing-panel, .sm-landing-foot-card{ background: var(--card); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 18px 45px -26px rgba(27,42,74,0.35); }
    .sm-landing-card{ padding: 24px; }
    .sm-landing-card h3{ margin: 0 0 12px; font-size: 1.35rem; }
    .sm-landing-card ul{ list-style:none; padding:0; margin:0; display:grid; gap:10px; }
    .sm-landing-card li{ display:flex; gap:10px; align-items:flex-start; color: var(--ink-soft); }
    .sm-landing-grid{ max-width:1180px; margin: 26px auto 0; display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
    .sm-landing-panel{ padding: 20px; }
    .sm-landing-panel h4{ margin: 0 0 8px; font-size: 1.05rem; }
    .sm-landing-panel p{ margin:0; color: var(--slate); line-height:1.65; font-size:0.95rem; }
    .sm-landing-footer{ max-width:1180px; margin: 20px auto 0; display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
    .sm-landing-foot-card{ padding: 18px 20px; display:flex; gap:12px; align-items:flex-start; }
    .sm-landing-foot-card h4{ margin: 0 0 4px; font-size: 1rem; }
    .sm-landing-foot-card p{ margin:0; color: var(--slate); }
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
      .sm-shell{ flex-direction:column; min-height:100vh; }
      .sm-sidebar{ width:100%; flex-direction:row; overflow-x:auto; padding:12px; order:2; position:sticky; bottom:0; z-index:20; min-height:auto; }
      .sm-brand{ display:none; }
      .sm-nav{ flex-direction:row; padding:0; }
      .sm-sidebar-foot{ display:none; }
      .sm-main{ order:1; min-height:auto; }
      .sm-stat-grid{ grid-template-columns: 1fr 1fr; }
      .sm-form-grid{ grid-template-columns: 1fr; }
      .sm-content{ padding: 16px; }
      .sm-landing-hero, .sm-landing-grid, .sm-landing-footer{ grid-template-columns: 1fr; }
      .sm-landing-shell{ padding: 20px 16px 32px; }
      .sm-landing-stats{ grid-template-columns: 1fr; }
    }
  `}</style>
);

export function Field({ label, children, span2 }) {
  return (
    <div className={"sm-field" + (span2 ? " span2" : "")}>
      <label className="sm-label">{label}</label>
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
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

export function Empty({ text }) {
  return <div className="sm-empty">{text}</div>;
}
