import React, { useEffect, useState } from "react";
import { bsToIso, isoToBs } from "../utils/helpers";

export default function NepaliDateInput({ value, onChange, className = "sm-input", ...props }) {
  const [draft, setDraft] = useState(() => isoToBs(value));
  const [lastValue, setLastValue] = useState(value);

  useEffect(() => {
    if (value !== lastValue) {
      setLastValue(value);
      setDraft(isoToBs(value));
    }
  }, [lastValue, value]);

  function update(event) {
    const next = event.target.value.replace(/[^0-9-]/g, "").slice(0, 10);
    setDraft(next);
    const iso = bsToIso(next);
    if (iso) onChange({ target: { value: iso } });
  }

  return <input {...props} className={className} type="text" inputMode="numeric" placeholder="YYYY-MM-DD (BS)" value={draft} onChange={update} />;
}