import { describe, expect, it } from "vitest";
import { isWellFormedIntent } from "#shared/protocol/isWellFormedIntent";

describe("isWellFormedIntent", () => {
  it.each([
    { type: "ready" },
    { type: "mulligan", keep: true },
    { type: "playCard", instanceId: "a" },
    {
      type: "playCard",
      instanceId: "a",
      targetSlot: undefined,
      digiXros: undefined,
      assembly: undefined,
      useAs: undefined,
    },
    { type: "playCard", instanceId: "a", targetSlot: null, digiXros: null },
    { type: "playCard", instanceId: "a", digiXros: { materialInstanceIds: ["b"], expanderPermanentIds: ["t"] } },
    { type: "playCard", instanceId: "a", assembly: { materialInstanceIds: ["b", "c"] }, useAs: "digimon" },
    { type: "digivolve", permanentId: "p", instanceId: "a", useAlternateCost: false, alternateRequirementIndex: 1 },
    { type: "dnaDigivolve", materialPermanentIds: ["p", "q"], instanceId: "a" },
    { type: "attack", attackerPermanentId: "p", target: { kind: "player" }, vortex: undefined },
    { type: "attack", attackerPermanentId: "p", target: { kind: "permanent", permanentId: "q" } },
    { type: "respondCounter" },
    { type: "respondCounter", sourceInstanceId: "a", effectKey: "k" },
    { type: "respondDecision", decisionId: "dec-1", response: { kind: "optional", accept: true } },
    { type: "showNothingToDoPrompts", show: false },
    { type: "manualMoveCard", anything: [1, 2] },
  ])("accepts %o", (intent) => {
    expect(isWellFormedIntent(intent)).toBe(true);
  });

  it.each([
    null,
    [],
    { kind: "playCard" },
    { type: 7 },
    { type: "mulligan" },
    { type: "playCard" },
    { type: "playCard", instanceId: "a", digiXros: ["b", "c"] },
    { type: "playCard", instanceId: "a", digiXros: { materialInstanceIds: "b" } },
    { type: "playCard", instanceId: "a", digiXros: { materialInstanceIds: ["b"], expanderPermanentIds: "t" } },
    { type: "playCard", instanceId: "a", assembly: ["b"] },
    { type: "playCard", instanceId: "a", useAs: "tamer" },
    { type: "attack", attackerPermanentId: "p", target: { kind: "permanent" } },
    { type: "attack", attackerPermanentId: "p" },
    { type: "respondCounter", effectKey: 7 },
    { type: "respondCounter", sourceInstanceId: {}, effectKey: [] },
    { type: "respondDecision", decisionId: "dec-1", response: "yes" },
    { type: "respondEvade", permanentId: "p", accept: "yes" },
    { type: "dnaDigivolve", materialPermanentIds: "p", instanceId: "a" },
  ])("rejects %o", (intent) => {
    expect(isWellFormedIntent(intent)).toBe(false);
  });
});
