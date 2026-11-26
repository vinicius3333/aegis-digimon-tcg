import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { advance } from "#api/engine/testkit/advance";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";
import { compiled } from "#api/cards/BD06/BD06-04";

const cardId = "BD06-04";
const gemmon = "BD06-03";
const alysionHost = "BD06-05";
const vegetationHost = "BT1-065";
const vanilla = "BT1-009";

describe("BD06-04 Elfmon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD06",
      nameEn: "Elfmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      types: ["Fairy", "ALYSION"],
      effectText: "[All Turns] All of your suspended Digimon get +1000 DP.",
      inheritedEffectText: "[All Turns] This suspended Digimon with the [ALYSION] trait gets +1000 DP.",
    });
  });

  it("compiles the suspended aura and the inherited suspended ALYSION aura", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Aura",
            target: { filter: { controller: "mine", kind: ["Digimon"], suspended: true }, count: "all" },
            effect: { kind: "modifyDP", amount: 1000 },
          },
        ],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { isSelf: true },
            effect: { kind: "modifyDP", amount: 1000 },
            while: {
              kind: "allOf",
              conditions: [{ kind: "selfIsSuspended" }, { kind: "selfHasTrait" }],
            },
          },
        ],
      },
    ]);
  });

  it("gives +1000 DP to each of your suspended Digimon, itself included, on either player's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "elfmon", suspended: true },
          { card: vanilla, as: "suspendedVanilla", suspended: true },
          { card: vanilla, as: "activeVanilla" },
        ],
      },
      1: { battleArea: [{ card: vanilla, as: "opponentSuspended", suspended: true }] },
    });
    await s.ready();

    expect(s.perm("elfmon").currentDP).toBe(4000);
    expect(s.perm("suspendedVanilla").currentDP).toBe(4000);
    expect(s.perm("activeVanilla").currentDP).toBe(3000);
    expect(s.perm("opponentSuspended").currentDP).toBe(3000);

    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("activeVanilla").permanentId]);
    expect(s.perm("activeVanilla").currentDP).toBe(4000);
    await advance(s.engine).verb.unsuspend([s.perm("suspendedVanilla").permanentId]);
    expect(s.perm("suspendedVanilla").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("gives its inherited +1000 DP only to a suspended ALYSION host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: alysionHost, as: "suspendedAlysion", suspended: true, under: [cardId] },
          { card: alysionHost, as: "activeAlysion", under: [cardId] },
          { card: vegetationHost, as: "suspendedVegetation", suspended: true, under: [cardId] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("suspendedAlysion").currentDP).toBe(8000);
    expect(s.perm("activeAlysion").currentDP).toBe(7000);
    expect(s.perm("suspendedVegetation").currentDP).toBe(4000);
    assertNoLoudGap(s);
  });

  it("stacks its own aura with Gemmon's inherited bonus after digivolving from Gemmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: gemmon, as: "stack", under: ["BD06-01"] }],
        hand: [{ card: cardId, as: "elfmon" }],
        deck: [vanilla],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("elfmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard.cardId === cardId);
    await drainMicrotasks(20);

    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["BD06-01", gemmon]);
    expect(s.perm("stack").currentDP).toBe(3000);
    await advance(s.engine).verb.suspend([s.perm("stack").permanentId]);
    expect(s.perm("stack").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
