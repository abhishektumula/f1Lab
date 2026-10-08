// Who is driving and what the car looks like. Saved in localStorage.

export interface Profile {
  name: string;
  number: number;
  team: string; // a TEAMS id, or "custom" once colours are edited by hand
  body: string;
  accent: string;
  helmet: string;
}

export interface Team {
  id: string;
  label: string;
  body: string;
  accent: string;
}

export const TEAMS: Team[] = [
  { id: "ferrari", label: "Ferrari", body: "#dc0000", accent: "#fff200" },
  { id: "redbull", label: "Red Bull", body: "#1e2a78", accent: "#ff1e3c" },
  { id: "mercedes", label: "Mercedes", body: "#c9ced3", accent: "#00d2be" },
  { id: "mclaren", label: "McLaren", body: "#ff8000", accent: "#47c7fc" },
  { id: "aston", label: "Aston Martin", body: "#006f62", accent: "#cedc00" },
  { id: "alpine", label: "Alpine", body: "#0090ff", accent: "#ff87bc" },
];

export const DEFAULT_PROFILE: Profile = {
  name: "Max Verstappen",
  number: 1,
  team: "ferrari",
  body: TEAMS[0].body,
  accent: TEAMS[0].accent,
  helmet: "#f5f5f5",
};

export interface CarStyle {
  body: string;
  bodyEdge: string;
  accent: string;
  helmet: string;
  dark: string;
  numberColor: string;
  number: number;
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function shade(hex: string, factor: number) {
  const [r, g, b] = channels(hex).map((c) => Math.round(c * factor));
  return `rgb(${r}, ${g}, ${b})`;
}

function isLight(hex: string) {
  const [r, g, b] = channels(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export function carStyle(profile: Profile): CarStyle {
  return {
    body: profile.body,
    bodyEdge: shade(profile.body, 0.6),
    accent: profile.accent,
    helmet: profile.helmet,
    dark: "#1b1b1d",
    numberColor: isLight(profile.body) ? "#111111" : "#ffffff",
    number: profile.number,
  };
}

// First three letters of the surname, like a timing-screen code.
export function driverCode(name: string) {
  const last = name.trim().split(/\s+/).pop() ?? "";
  return last.slice(0, 3).toUpperCase() || "---";
}

const STORAGE_KEY = "f1lab:profile";
const HEX = /^#[0-9a-f]{6}$/i;

export function loadProfile(): Profile | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!raw || typeof raw !== "object") return null;
    const { name, number, team, body, accent, helmet } = raw;
    if (
      typeof name !== "string" ||
      !Number.isInteger(number) ||
      number < 0 ||
      number > 99 ||
      typeof team !== "string" ||
      ![body, accent, helmet].every((c) => typeof c === "string" && HEX.test(c))
    ) {
      return null;
    }
    return { name: name.slice(0, 20), number, team, body, accent, helmet };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage can be blocked (private mode); the profile just won't persist.
  }
}
