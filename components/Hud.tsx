import {
  IconAlertTriangle,
  IconArrowBigRightLines,
  IconCircleCheck,
  IconHeartFilled,
  IconPalette,
  IconPower,
  IconTools,
  IconVolume,
  IconVolumeOff,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { HudData, PressedKeys } from "@/lib/game";
import { driverCode, type Profile } from "@/lib/profile";
import Instructions from "./Instructions";

const LED_COUNT = 15;

// Same layout as the lights on an F1 steering wheel: green, red, blue.
const ledColor = (i: number) => (i < 5 ? "#22c55e" : i < 10 ? "#ef4444" : "#3b82f6");

const healthColor = (health: number) => (health > 60 ? "#22c55e" : health > 30 ? "#f59e0b" : "#ef4444");

interface IconButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  progress?: number;
  children: ReactNode;
}

function IconButton({ label, onClick, active, progress = 0, children }: IconButtonProps) {
  const ring = "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))";
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={(e) => {
        onClick();
        e.currentTarget.blur();
      }}
      className={`pointer-events-auto relative grid size-11 place-items-center rounded-full border backdrop-blur transition ${
        active
          ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300"
          : "border-white/20 bg-black/40 text-white/80 hover:border-white/50"
      }`}
    >
      {progress > 0 && (
        <span
          className="absolute -inset-1 rounded-full"
          style={{
            background: `conic-gradient(#fff200 ${progress * 360}deg, transparent 0)`,
            mask: ring,
            WebkitMask: ring,
          }}
        />
      )}
      {children}
    </button>
  );
}

interface HudProps {
  data: HudData;
  pressed: PressedKeys;
  muted: boolean;
  profile: Profile;
  onToggleSound: () => void;
  onToggleEngine: () => void;
  onOpenPanel: () => void;
}

export default function Hud({
  data,
  pressed,
  muted,
  profile,
  onToggleSound,
  onToggleEngine,
  onOpenPanel,
}: HudProps) {
  const lit = data.engineOn
    ? Math.floor(Math.min(1, Math.max(0, (data.rpm - 0.55) / 0.45)) * LED_COUNT)
    : 0;
  const repairing = data.pitProgress > 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 select-none font-mono text-white">
      {data.hits > 0 && <div key={data.hits} className="impact-flash" />}

      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          onOpenPanel();
          e.currentTarget.blur();
        }}
        className="pointer-events-auto absolute left-5 top-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#141413]/90 p-2 pr-4 text-left backdrop-blur transition hover:border-white/30"
        title="Change driver and car"
      >
        <span className="min-w-8 text-center text-4xl font-black italic leading-none" style={{ color: profile.accent }}>
          {profile.number}
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold uppercase tracking-widest">{profile.name || "Driver"}</span>
          <span className="block text-xs uppercase tracking-widest text-white/50">{driverCode(profile.name)}</span>
        </span>
      </button>

      <div className="absolute right-5 top-5 flex gap-2">
        <IconButton label="Driver and car" onClick={onOpenPanel}>
          <IconPalette size={22} />
        </IconButton>
        <IconButton
          label="Engine · hold Space to start, hold Tab to stop"
          onClick={onToggleEngine}
          active={data.engineOn}
          progress={data.engineOn ? data.stopHold : data.startHold}
        >
          <IconPower size={22} />
        </IconButton>
        <IconButton label={muted ? "Sound off (M)" : "Sound on (M)"} onClick={onToggleSound} active={!muted}>
          {muted ? <IconVolumeOff size={22} /> : <IconVolume size={22} />}
        </IconButton>
      </div>

      <div className="absolute left-1/2 top-6 -translate-x-1/2">
        {repairing ? (
          <div className="instr-card flex min-w-64 flex-col gap-2 rounded-2xl border border-emerald-400/40 bg-[#141413]/90 px-5 py-3 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
              <IconTools size={20} className="spin-slow" />
              Pit stop
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${data.pitProgress * 100}%` }} />
            </div>
          </div>
        ) : data.pitDone ? (
          <div className="instr-card flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-[#141413]/90 px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300 backdrop-blur">
            <IconCircleCheck size={20} />
            Car repaired
          </div>
        ) : data.health < 50 ? (
          <div className="instr-card flex items-center gap-2 rounded-2xl border border-red-400/40 bg-[#141413]/90 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-red-300 backdrop-blur">
            <IconAlertTriangle size={20} />
            {data.health <= 0 ? "Engine failure · restart and head to the pit" : "Damaged · pit stop on the right"}
            <IconArrowBigRightLines size={20} className="nudge-right" />
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#141413]/90 px-6 py-3 backdrop-blur">
        <div className="flex gap-1.5">
          {Array.from({ length: LED_COUNT }, (_, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: i < lit ? ledColor(i) : "rgba(255,255,255,0.12)",
                boxShadow: i < lit ? `0 0 8px ${ledColor(i)}` : "none",
              }}
            />
          ))}
        </div>
        <div className="flex items-end gap-6">
          <div className="text-center">
            <div className="w-24 text-5xl font-bold tabular-nums leading-none">{data.speed}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/50">km/h</div>
          </div>
          <div className="text-center">
            <div className="w-10 text-5xl font-bold leading-none" style={{ color: profile.accent }}>
              {data.gear}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/50">gear</div>
          </div>
          <div className="w-28 pb-1">
            <div className="flex items-center gap-1.5" style={{ color: healthColor(data.health) }}>
              <IconHeartFilled size={18} className={data.health < 30 ? "pulse-fast" : ""} />
              <span className="text-2xl font-bold tabular-nums leading-none">{data.health}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{ width: `${data.health}%`, background: healthColor(data.health) }}
              />
            </div>
            <div className="mt-1 text-center text-[10px] uppercase tracking-[0.3em] text-white/50">health</div>
          </div>
        </div>
      </div>

      <Instructions hud={data} pressed={pressed} />
    </div>
  );
}
