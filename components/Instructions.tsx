import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
} from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";
import type { HudData, PressedKeys } from "@/lib/game";

interface KeycapProps {
  children: ReactNode;
  active?: boolean;
  wide?: boolean;
  small?: boolean;
  className?: string;
  style?: CSSProperties;
}

function Keycap({ children, active, wide, small, className = "", style }: KeycapProps) {
  const size = small ? "h-7 text-[10px]" : "h-10 text-xs";
  const width = wide ? (small ? "min-w-14 px-2" : "min-w-20 px-3") : small ? "w-7" : "w-10";
  return (
    <kbd
      style={style}
      className={`keycap inline-flex ${size} ${width} items-center justify-center rounded-lg border font-sans font-semibold uppercase tracking-wider ${
        active ? "keycap-active" : "border-white/25 bg-white/10 text-white/85"
      } ${className}`}
    >
      {children}
    </kbd>
  );
}

interface InstructionsProps {
  hud: HudData;
  pressed: PressedKeys;
}

// Big animated prompts until the player has started and driven, then a live key legend.
export default function Instructions({ hud, pressed }: InstructionsProps) {
  const arrowSize = 18;

  return (
    <>
      {!hud.engineOn && (
        <div className="instr-card absolute bottom-48 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[#141413]/90 px-7 py-5 backdrop-blur">
          <div className="flex items-center gap-3 text-sm text-white/85">
            <span className="uppercase tracking-[0.2em]">Hold</span>
            <Keycap wide active={pressed.space} className={pressed.space ? "" : "keycap-demo"}>
              Space
            </Keycap>
            <span className="uppercase tracking-[0.2em]">to start the engine</span>
          </div>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#fff200]"
              style={{ width: `${hud.startHold * 100}%` }}
            />
          </div>
        </div>
      )}

      {hud.engineOn && !hud.driven && (
        <div className="instr-card absolute bottom-48 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[#141413]/90 px-7 py-5 backdrop-blur">
          <div className="flex flex-col items-center gap-1.5">
            <Keycap className="keycap-wave" style={{ "--i": 0 } as CSSProperties}>
              <IconArrowUp size={arrowSize} />
            </Keycap>
            <div className="flex gap-1.5">
              <Keycap className="keycap-wave" style={{ "--i": 3 } as CSSProperties}>
                <IconArrowLeft size={arrowSize} />
              </Keycap>
              <Keycap className="keycap-wave" style={{ "--i": 2 } as CSSProperties}>
                <IconArrowDown size={arrowSize} />
              </Keycap>
              <Keycap className="keycap-wave" style={{ "--i": 1 } as CSSProperties}>
                <IconArrowRight size={arrowSize} />
              </Keycap>
            </div>
          </div>
          <div className="text-center text-xs uppercase tracking-[0.2em] text-white/80">
            Arrow keys to drive
            <div className="mt-1 text-[10px] tracking-[0.15em] text-white/45">
              hold ↑ and steer for donuts
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-5 hidden flex-col items-start gap-2 rounded-2xl border border-white/10 bg-[#141413]/90 p-3 text-[10px] uppercase tracking-[0.18em] text-white/60 backdrop-blur md:flex">
        <div className="flex items-center gap-2">
          <span>drive</span>
          <Keycap small active={pressed.left}>
            <IconArrowLeft size={14} />
          </Keycap>
          <Keycap small active={pressed.down}>
            <IconArrowDown size={14} />
          </Keycap>
          <Keycap small active={pressed.up}>
            <IconArrowUp size={14} />
          </Keycap>
          <Keycap small active={pressed.right}>
            <IconArrowRight size={14} />
          </Keycap>
        </div>
        <div className="flex items-center gap-2">
          <span>handbrake</span>
          <Keycap small wide active={pressed.handbrake}>
            Shift
          </Keycap>
        </div>
        <div className="flex items-center gap-2">
          <span>hold · start</span>
          <Keycap small wide active={pressed.space}>
            Space
          </Keycap>
        </div>
        <div className="flex items-center gap-2">
          <span>hold · stop</span>
          <div className="relative">
            <Keycap small wide active={pressed.tab}>
              Tab
            </Keycap>
            {hud.stopHold > 0 && (
              <div className="absolute -bottom-1.5 left-0 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-[#fff200]" style={{ width: `${hud.stopHold * 100}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
