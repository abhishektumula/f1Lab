import { IconRefresh, IconX } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { drawCar } from "@/lib/drawCar";
import { createCar } from "@/lib/physics";
import {
  DEFAULT_PROFILE,
  TEAMS,
  carStyle,
  driverCode,
  type Profile,
} from "@/lib/profile";

const PREVIEW_W = 280;
const PREVIEW_H = 120;

function CarPreview({ profile }: { profile: Profile }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = PREVIEW_W * dpr;
    canvas.height = PREVIEW_H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#34363a";
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
    ctx.translate(PREVIEW_W / 2, PREVIEW_H / 2);
    ctx.scale(1.7, 1.7);
    const car = createCar(0, 0, 0);
    drawCar(ctx, car, carStyle(profile));
  }, [profile]);

  return (
    <canvas
      ref={ref}
      className="w-full rounded-xl border border-white/10"
      style={{ aspectRatio: `${PREVIEW_W} / ${PREVIEW_H}` }}
    />
  );
}

interface CustomizePanelProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
  onClose: () => void;
}

const label = "mb-1.5 block text-[10px] uppercase tracking-[0.25em] text-white/50";
const field =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-white/50";

export default function CustomizePanel({ profile, onChange, onClose }: CustomizePanelProps) {
  const colour = (key: "body" | "accent" | "helmet", value: string) =>
    onChange({ ...profile, [key]: value, team: key === "helmet" ? profile.team : "custom" });

  return (
    <div className="panel-in pointer-events-auto absolute left-5 top-20 max-h-[calc(100vh-6rem)] w-80 overflow-y-auto rounded-2xl border border-white/15 bg-black/70 p-5 font-mono text-white backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.25em]">Driver &amp; car</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <IconX size={18} />
        </button>
      </div>

      <CarPreview profile={profile} />

      <div className="mt-5 grid grid-cols-[1fr_5rem] gap-3">
        <div>
          <label htmlFor="driver-name" className={label}>
            Driver
          </label>
          <input
            id="driver-name"
            className={field}
            value={profile.name}
            maxLength={20}
            onChange={(e) => onChange({ ...profile, name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="driver-number" className={label}>
            Number
          </label>
          <input
            id="driver-number"
            className={field}
            type="number"
            min={0}
            max={99}
            value={profile.number}
            onChange={(e) =>
              onChange({
                ...profile,
                number: Math.min(99, Math.max(0, Math.round(Number(e.target.value) || 0))),
              })
            }
          />
        </div>
      </div>
      <div className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-white/40">
        Timing code · {driverCode(profile.name)}
      </div>

      <div className="mt-5">
        <span className={label}>Team</span>
        <div className="grid grid-cols-3 gap-2">
          {TEAMS.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => onChange({ ...profile, team: team.id, body: team.body, accent: team.accent })}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[10px] uppercase tracking-wider transition ${
                profile.team === team.id
                  ? "border-white/70 bg-white/10"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <span
                className="block size-7 rounded-full border border-white/20"
                style={{ background: `linear-gradient(135deg, ${team.body} 55%, ${team.accent} 55%)` }}
              />
              {team.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {(
          [
            ["body", "Body"],
            ["accent", "Accent"],
            ["helmet", "Helmet"],
          ] as const
        ).map(([key, text]) => (
          <div key={key}>
            <label htmlFor={`colour-${key}`} className={label}>
              {text}
            </label>
            <input
              id={`colour-${key}`}
              type="color"
              value={profile[key]}
              onChange={(e) => colour(key, e.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange(DEFAULT_PROFILE)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
      >
        <IconRefresh size={16} />
        Reset
      </button>
    </div>
  );
}
