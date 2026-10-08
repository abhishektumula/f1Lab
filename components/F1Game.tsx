"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EngineSound } from "@/lib/engineSound";
import { Game, INITIAL_HUD, type HudData, type PressedKeys } from "@/lib/game";
import { DEFAULT_PROFILE, loadProfile, saveProfile, type Profile } from "@/lib/profile";
import CustomizePanel from "./CustomizePanel";
import Hud from "./Hud";

const NO_KEYS: PressedKeys = {
  up: false,
  down: false,
  left: false,
  right: false,
  handbrake: false,
  space: false,
  tab: false,
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export default function F1Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const soundRef = useRef<EngineSound | null>(null);
  const mutedRef = useRef(true);
  const panelOpenRef = useRef(false);

  const [hud, setHud] = useState<HudData>(INITIAL_HUD);
  const [pressed, setPressed] = useState<PressedKeys>(NO_KEYS);
  const [muted, setMuted] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  const toggleSound = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    if (!next && !soundRef.current) soundRef.current = new EngineSound();
    soundRef.current?.setMuted(next);
    setMuted(next);
  }, []);

  const setPanel = useCallback((open: boolean) => {
    panelOpenRef.current = open;
    if (open) gameRef.current?.releaseAll();
    setPanelOpen(open);
  }, []);

  const updateProfile = useCallback((next: Profile) => {
    setProfile(next);
    saveProfile(next);
  }, []);

  useEffect(() => {
    return () => {
      soundRef.current?.dispose();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const game = new Game(canvasRef.current!, {
      onHud: setHud,
      onKeys: setPressed,
      getSound: () => soundRef.current,
    });
    gameRef.current = game;
    game.start();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && panelOpenRef.current) {
        setPanel(false);
        return;
      }
      if (panelOpenRef.current || isTyping(e.target)) return;
      if (e.code === "KeyM") {
        if (!e.repeat) toggleSound();
        return;
      }
      if (game.keyDown(e.code)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (panelOpenRef.current || isTyping(e.target)) return;
      if (game.keyUp(e.code)) e.preventDefault();
    };
    const onResize = () => game.resize();
    // Stop the engine droning while the tab is hidden (the loop is paused then).
    const onVisibility = () => {
      if (document.hidden) {
        game.releaseAll();
        soundRef.current?.setMuted(true);
      } else if (!mutedRef.current) {
        soundRef.current?.setMuted(false);
      }
    };
    const onBlur = () => game.releaseAll();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      game.stop();
      gameRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [toggleSound, setPanel]);

  // Restore the saved driver and car after mount, so server and client markup match.
  useEffect(() => {
    const saved = loadProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable on the client
    if (saved) setProfile(saved);
  }, []);

  useEffect(() => {
    gameRef.current?.setProfile(profile);
  }, [profile]);

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 h-full w-full" />
      <Hud
        data={hud}
        pressed={pressed}
        muted={muted}
        profile={profile}
        onToggleSound={toggleSound}
        onToggleEngine={() => gameRef.current?.toggleEngine()}
        onOpenPanel={() => setPanel(!panelOpen)}
      />
      {panelOpen && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <CustomizePanel profile={profile} onChange={updateProfile} onClose={() => setPanel(false)} />
        </div>
      )}
    </>
  );
}
