import type { CardGrip } from "@/packOpening/scene/createCardGrip";

export function resetCardGrip(grip: CardGrip) {
  Object.assign(grip, {
    yaw: 0,
    pitch: 0,
    zoom: 1,
    yawVelocity: 0,
    pitchVelocity: 0,
    pointerId: undefined,
    travel: 0,
    dragged: false,
  });
}
