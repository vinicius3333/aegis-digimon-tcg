import { useLayoutEffect, useState, type HTMLAttributes, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { handFocusPlane } from "./handFocusGeometry";
import { useHandFacePlane } from "./useHandFacePlane";
import { useHandArrivalArt } from "./useHandArrivalArt";

/** The physical slot owns accessibility and pointer capture; this face escapes its clip. */
export function HandHoverFace({
  instanceId,
  row,
  children,
  className,
  events,
  onPress,
  onReady,
}: {
  instanceId: string;
  row: HTMLDivElement;
  children: ReactNode;
  className: string;
  events: HTMLAttributes<HTMLDivElement>;
  onPress: (event: PointerEvent<HTMLDivElement>, origin: HTMLElement) => void;
  onReady: () => void;
}) {
  const plane = useHandFacePlane(row, instanceId, { scale: 1.2 });
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const decoded = useHandArrivalArt(container, new Set([instanceId]), "[data-hand-hover-instance-id]");
  const ready = decoded.has(instanceId);
  useLayoutEffect(() => {
    // Portals leave the board's responsive selectors, so retain its corner controls.
    for (const corner of plane?.corners ?? []) {
      const control = container?.querySelector<HTMLElement>(corner.selector);
      for (const [property, value] of corner.properties) control?.style.setProperty(property, value);
    }
  }, [plane, container, children]);
  useLayoutEffect(() => {
    if (ready) onReady();
  }, [ready, onReady]);
  if (!plane) return null;
  const safe = handFocusPlane({ ...plane, angle: 0, viewportWidth: innerWidth, scale: 1.2 });
  return createPortal(
    <div className="game-hand-hover" ref={setContainer} aria-hidden="true">
      <div
        className="game-hand-hover__anchor"
        style={{
          left: plane.centerX - plane.width / 2 + safe.safeX,
          top: plane.centerY - plane.height / 2,
          width: plane.width,
          height: plane.height,
          visibility: ready ? "visible" : "hidden",
        }}
      >
        <div className="game-hand-hover__scale">
          <div
            {...events}
            className={`game-hand-hover__face ${className}`}
            data-hand-hover-instance-id={instanceId}
            onPointerDown={(event) => {
              const origin = [...row.children].find(
                (child): child is HTMLElement =>
                  child instanceof HTMLElement && child.dataset.handInstanceId === instanceId,
              );
              if (origin) onPress(event, origin);
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
