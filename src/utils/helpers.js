export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function snakeToCamel(value) {
  return value.replace(/_([a-z])/g, (_, chr) => chr.toUpperCase());
}

export function camelizeKeys(value) {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.entries(value).reduce((acc, [key, item]) => {
      acc[snakeToCamel(key)] = camelizeKeys(item);
      return acc;
    }, {});
  }
  return value;
}

export function getDriveImageCandidates(rawUrl) {
  if (typeof rawUrl !== "string") return [];

  const trimmed = rawUrl.trim();
  if (!trimmed) return [];

  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)(?:\/|$)/i) || trimmed.match(/[?&]id=([^&]+)/i);
  if (!driveMatch) return [trimmed];

  const id = driveMatch[1];
  return [
    `https://drive.google.com/thumbnail?id=${id}`,
    `https://drive.google.com/uc?export=view&id=${id}`,
    trimmed,
  ];
}

export const convertDriveUrl = (rawUrl) => {
  try {
    const [firstCandidate] = getDriveImageCandidates(rawUrl);
    if (!firstCandidate) {
      throw new Error("Invalid Google Drive URL");
    }
    return firstCandidate;
  } catch (error) {
    console.error("Invalid Google Drive URL");
    return "";
  }
};

export function normalizeImageUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)(?:\/|$)/i) || trimmed.match(/[?&]id=([^&]+)/i);
  if (driveMatch) {
    return convertDriveUrl(trimmed);
  }

  return trimmed;
}

export const DEFAULT_GRADE_SCALE = [
  { min: 90, grade: "A+", remark: "Outstanding" },
  { min: 80, grade: "A", remark: "Excellent" },
  { min: 70, grade: "B+", remark: "Very Good" },
  { min: 60, grade: "B", remark: "Good" },
  { min: 50, grade: "C+", remark: "Satisfactory" },
  { min: 40, grade: "C", remark: "Fair" },
  { min: 33, grade: "D", remark: "Needs Improvement" },
  { min: 0, grade: "F", remark: "Fail" },
];

export function gradeFor(pct, scale) {
  const s = [...scale].sort((a, b) => b.min - a.min);
  for (const row of s) if (pct >= row.min) return row;
  return s[s.length - 1];
}
