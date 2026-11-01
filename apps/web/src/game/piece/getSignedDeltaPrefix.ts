export function getSignedDeltaPrefix(delta: number): string {
  if (delta > 0) {
    return "+";
  }
  if (delta < 0) {
    return "−";
  }
  return "±";
}
