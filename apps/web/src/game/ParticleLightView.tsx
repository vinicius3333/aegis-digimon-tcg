import { useContext, useLayoutEffect, useRef } from "react";
import { arrivalLightParticles, paintParticleLight } from "./particleLightCanvas";
import { PARTICLE_LIGHT_MS } from "./particleLight";
import type { BurstPalette } from "./showcases";
import { mountIndependentParticleLight, type ParticleLightOwner } from "./independentParticleLight";
import { ParticleLightScopeContext } from "./ParticleLightScope";

/** The CSS clock owns delay/seek/pause; landing groups share the arrival clock. */
export function ParticleLight({
  palette,
  owner,
  landing = false,
}: {
  palette: BurstPalette;
  owner?: ParticleLightOwner;
  landing?: boolean;
}) {
  const register = useContext(ParticleLightScopeContext);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current!,
      clock = clockRef.current!;
    if (typeof clock.getAnimations !== "function") return;
    if (owner) return mountIndependentParticleLight(canvas, clock, palette, owner, register);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      animation: Animation | undefined,
      previousAge: number | undefined;
    function size() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    }
    function paint() {
      animation ??= clock
        .getAnimations()
        .find((entry) => "animationName" in entry && entry.animationName === "battle-particle-clock");
      const age = Number(animation?.currentTime ?? 0) - Number(animation?.effect?.getTiming().delay ?? 0);
      const paintedAge = media.matches ? PARTICLE_LIGHT_MS : age;
      if (previousAge !== paintedAge) {
        paintParticleLight(canvas, paintedAge, palette, landing ? arrivalLightParticles : undefined);
        previousAge = paintedAge;
      }
      if (!media.matches && animation && animation.playState !== "finished" && animation.playState !== "idle")
        frame = requestAnimationFrame(paint);
    }
    function restart() {
      cancelAnimationFrame(frame);
      animation = undefined;
      previousAge = undefined;
      paint();
    }
    const resize = new ResizeObserver(() => {
      size();
      restart();
    });
    resize.observe(canvas);
    size();
    restart();
    media.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      media.removeEventListener("change", restart);
    };
  }, [palette.base, palette.edge, owner, register, landing]);
  return (
    <>
      <span ref={clockRef} className="battle-burst__clock" />
      <canvas
        ref={canvasRef}
        className="battle-burst__particles"
        data-emitters={landing ? 10 : 6}
        data-capacity={landing ? 495 : 305}
        data-landing={landing ? "true" : undefined}
      />
    </>
  );
}
