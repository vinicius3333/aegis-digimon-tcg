export const GameRulesPolicy = {
  CONSTRUCTED: { name: "CONSTRUCTED", value: "constructed" },
  SEALED: { name: "SEALED", value: "sealed-v1" },
} as const;

export type GameRulesPolicy = (typeof GameRulesPolicy)[keyof typeof GameRulesPolicy]["value"];
