import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-040.js";

describe("BT9-040 Angewomon (X Antibody)", () => {
  it("matches catalog and Q1834 exact-name, security-bound recovery IR", () => {
    expect(getCardDefinition("BT9-040")).toMatchObject({
      cardId: "BT9-040", nameEn: "Angewomon (X Antibody)", colors: ["Yellow"], kinds: ["Digimon"], level: 5,
      playCost: 8, dp: 8000, evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }], forms: ["Ultimate"],
      attributes: ["Vaccine"], types: ["Archangel", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Angewomon"], cost: 0, isAlternate: true }],
      effects: [{ trigger: "WhenDigivolving", actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" },
        { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 }, condition: { kind: "allOf" } },
      ] }],
    });
  });

  it("gives Security Attack -1 and recovers with Angewomon in its sources at 5 or fewer security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-037", as: "base" }],
          hand: [{ card: "BT9-040", as: "evolving" }],
          deck: ["BT1-048", "BT1-049"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-040"));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not treat an X Antibody trait as the named X Antibody card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-036", as: "base" }],
          hand: [{ card: "BT9-040", as: "evolving" }],
          security: [{ card: "BT1-001", as: "security" }],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-040"));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("does not recover when the player already has more than five security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-037", as: "base" }],
          hand: [{ card: "BT9-040", as: "evolving" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          deck: ["BT1-007", "BT1-008"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-040"));
    expect(s.state.players[0]!.security).toHaveLength(6);
  });
});
