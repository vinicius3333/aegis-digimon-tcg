import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { playSound } from "../design/sound";
import type { EffectActivation } from "./effectSource";
import { permanentVisualElement } from "./screen/dropZones";
import { spotlightHoles, type SpotlightSubject } from "./spotlight";
import { FieldActivationLight } from "./FieldActivationLight";

/** A brief focus on the accepted effect's source. The mask never captures input. */
export function EffectFocus({
  sources,
  board,
  permanents,
  choosingTargets,
}: {
  sources: readonly EffectActivation[];
  board: RefObject<HTMLDivElement | null>;
  permanents: RefObject<Record<string, HTMLDivElement | null>>;
  choosingTargets: boolean;
}) {
  const maskId = useId();
  const source = [...sources]
    .reverse()
    .find((activation) => activation.linked !== true && activation.site.zone === "field");
  const permanentId = source?.site.zone === "field" ? source.site.permanentId : undefined;
  const [geometry, setGeometry] = useState<{ subject: SpotlightSubject; width: number; height: number }>();
  const lastSoundedKey = useRef(-1);
  const sourceKey = source?.key;

  useEffect(() => {
    setGeometry(undefined);
    if (!permanentId || choosingTargets) return;
    let frame = 0;
    let previous = "";
    function measure() {
      frame = requestAnimationFrame(measure);
      const root = board.current;
      const permanent = permanents.current[permanentId!];
      if (!root || !permanent?.isConnected) {
        if (previous) setGeometry(undefined);
        previous = "";
        return;
      }
      const bounds = root.getBoundingClientRect();
      // The visual element already includes rotation, scaling and the arrival's bounce.
      const card = permanentVisualElement(permanent).getBoundingClientRect();
      const signature = [
        bounds.left,
        bounds.top,
        bounds.width,
        bounds.height,
        card.x,
        card.y,
        card.width,
        card.height,
      ].join(":");
      if (signature === previous) return;
      previous = signature;
      setGeometry({
        width: bounds.width,
        height: bounds.height,
        subject: {
          id: permanentId!,
          x: card.left - bounds.left,
          y: card.top - bounds.top,
          width: card.width,
          height: card.height,
        },
      });
    }
    measure();
    return () => cancelAnimationFrame(frame);
  }, [permanentId, choosingTargets, board, permanents]);

  useEffect(() => {
    if (
      sourceKey === undefined ||
      sourceKey <= lastSoundedKey.current ||
      choosingTargets ||
      !geometry ||
      !permanentId ||
      geometry.subject.id !== permanentId ||
      !permanents.current[permanentId]?.isConnected ||
      geometry.subject.width <= 0 ||
      geometry.subject.height <= 0 ||
      geometry.width <= 0 ||
      geometry.height <= 0
    )
      return;
    // Match the visible focus, rather than a receipt that can arrive before the
    // announcement. Geometry changes and the same source resuming stay silent.
    lastSoundedKey.current = sourceKey;
    playSound("effectFocus");
  }, [sourceKey, choosingTargets, geometry, permanentId, permanents]);

  const hole = geometry && spotlightHoles([geometry.subject])[0];
  if (!source || choosingTargets || !geometry || !hole || geometry.width <= 0 || geometry.height <= 0) return null;
  return (
    <svg
      className="game-effect-focus"
      data-testid="effect-focus"
      data-source-card-id={source.cardId}
      data-source-permanent-id={permanentId}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect width={geometry.width} height={geometry.height} fill="white" />
          <rect x={hole.x} y={hole.y} width={hole.width} height={hole.height} rx={hole.radius} fill="black" />
        </mask>
      </defs>
      <rect
        className="game-effect-focus__shade"
        width={geometry.width}
        height={geometry.height}
        mask={`url(#${maskId})`}
      />
      <rect
        className="game-effect-focus__source"
        x={hole.x}
        y={hole.y}
        width={hole.width}
        height={hole.height}
        rx={hole.radius}
      />
      <g
        key={source.key}
        className="game-effect-focus__pulse"
        data-activation-key={source.key}
        mask={`url(#${maskId})`}
      >
        <svg
          x={hole.x - hole.width * 0.6}
          y={hole.y - hole.height * 0.6}
          width={hole.width * 2.2}
          height={hole.height * 2.2}
          viewBox="-110 -154 220 308"
          preserveAspectRatio="none"
          overflow="visible"
        >
          <FieldActivationLight />
        </svg>
      </g>
    </svg>
  );
}
