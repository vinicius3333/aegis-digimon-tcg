export interface HandFocusPlane {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angle: number;
  safeX: number;
}

/** Keep the authored local lift inside our viewport without moving the resting hand. */
export function handFocusPlane({
  centerX,
  centerY,
  width,
  height,
  angle,
  viewportWidth,
  scale = 1.3,
}: Omit<HandFocusPlane, "safeX"> & {
  viewportWidth: number;
  scale?: number;
}): HandFocusPlane {
  const radians = (angle * Math.PI) / 180;
  const liftedX = centerX + Math.sin(radians) * 0.42 * height * scale;
  const halfWidth = (scale * (Math.abs(Math.cos(radians)) * width + Math.abs(Math.sin(radians)) * height)) / 2;
  const safeX = Math.min(0, viewportWidth - 8 - liftedX - halfWidth) + Math.max(0, 8 - liftedX + halfWidth);
  return { centerX, centerY, width, height, angle, safeX };
}
