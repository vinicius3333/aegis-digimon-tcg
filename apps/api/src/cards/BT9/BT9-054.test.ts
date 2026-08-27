import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-054.js";

describe("BT9-054 Fujinmon", () => {
  it("matches catalog and complete hand, evolution, and inherited IR contract", () => {
    expect(getCardDefinition("BT9-054")).toMatchObject({
      cardId: "BT9-054", nameEn: "Fujinmon", colors: ["Green", "Black"], kinds: ["Digimon"], level: 6,
      playCost: 11, dp: 11000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }, { color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"], attributes: ["Vaccine"], types: ["Cyborg"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Main", isFromHand: true, actions: [{ kind: "PlaceUnder", optional: true, cost: { kind: "payMemory", memory: 1 } }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "Suspend", optional: true, cost: { kind: "trash" } }] },
        { trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "Suspend", target: { filter: { dp: { op: "lte", value: 5000 } } } }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }] },
      ],
    });
  });

  it("trashes a Machine or Cyborg to suspend an opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-060", as: "base" }],
          hand: [
            { card: "BT9-054", as: "evolving" },
            { card: "BT1-021", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
