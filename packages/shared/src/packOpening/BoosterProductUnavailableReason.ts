export const BoosterProductUnavailableReason = {
  INCOMPLETE: { name: "INCOMPLETE", value: "incomplete" },
  SPECIAL_COLLATION: { name: "SPECIAL_COLLATION", value: "special_collation" },
} as const;

export type BoosterProductUnavailableReason =
  (typeof BoosterProductUnavailableReason)[keyof typeof BoosterProductUnavailableReason]["value"];
