export const PrivateSealedStatus = {
  BUILDING: { name: "BUILDING", value: "building" },
  PLAYING: { name: "PLAYING", value: "playing" },
  SIDEBOARDING: { name: "SIDEBOARDING", value: "sideboarding" },
  COMPLETE: { name: "COMPLETE", value: "complete" },
  CANCELLED: { name: "CANCELLED", value: "cancelled" },
} as const;
export type PrivateSealedStatus = (typeof PrivateSealedStatus)[keyof typeof PrivateSealedStatus]["value"];
