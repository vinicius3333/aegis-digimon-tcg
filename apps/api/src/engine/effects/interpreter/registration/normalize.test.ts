import type { CompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { normalizeCompiledCard } from "./normalize.js";

const delayGrant = {
  kind: "GainKeyword" as const,
  target: { filter: { isSelfRef: true }, count: 1 as const, isSelf: true },
  keyword: { keyword: "Delay" as const, raw: "＜Delay＞" },
  duration: "permanent" as const,
};

describe("triggered Delay normalization", () => {
  it("folds every arming action in one clause and is idempotent", () => {
    const legacy: CompiledCard = {
      effects: [
        {
          trigger: "Main",
          keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
          actions: [
            {
              kind: "Digivolve",
              requiresDelayArmed: true,
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              into: { controllerDefault: "mine", kind: ["Digimon"] },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
        {
          trigger: "AllTurns",
          actions: [
            { kind: "SubTrigger", event: "onDeletionOf", actions: [delayGrant] },
            { kind: "SubTrigger", event: "whenEffectAddsToHand", actions: [delayGrant] },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    };

    const normalized = normalizeCompiledCard(legacy);
    const window = normalized.effects.find((effect) => effect.trigger === "AllTurns");
    expect(normalized.effects).toHaveLength(1);
    expect(window?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(window?.actions).toEqual([
      expect.objectContaining({
        kind: "SubTrigger",
        event: "onDeletionOf",
        actions: [expect.objectContaining({ kind: "Digivolve" })],
      }),
      expect.objectContaining({
        kind: "SubTrigger",
        event: "whenEffectAddsToHand",
        actions: [expect.objectContaining({ kind: "Digivolve" })],
      }),
    ]);
    expect(normalizeCompiledCard(normalized)).toEqual(normalized);
  });

  it("leaves an already folded triggered window unchanged", () => {
    const folded: CompiledCard = {
      effects: [
        {
          trigger: "EndOfOpponentsTurn",
          condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Digimon"] } },
          keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    };

    expect(normalizeCompiledCard(folded)).toEqual(folded);
  });

  it("does not merge conditional and unconditional arming actions", () => {
    const mixed: CompiledCard = {
      effects: [
        {
          trigger: "Main",
          keywords: [{ keyword: "Delay" }],
          actions: [
            {
              kind: "Delete",
              requiresDelayArmed: true,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
          ],
        },
        {
          trigger: "AllTurns",
          actions: [
            { kind: "SubTrigger", event: "onDeletionOf", actions: [delayGrant] },
            {
              kind: "SubTrigger",
              event: "whenPlayed",
              actions: [
                {
                  ...delayGrant,
                  condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Digimon"] } },
                },
              ],
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    };

    expect(normalizeCompiledCard(mixed)).toEqual(mixed);
  });
});
