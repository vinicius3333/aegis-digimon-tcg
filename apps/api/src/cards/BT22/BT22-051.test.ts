import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-051.js";
import "./index.js";

describe("BT22-051 Okuwamon", () => {
  it("returns the lowest-DP suspended opponent Digimon only with a same-level stack pair", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Return",
        to: "hand",
        target: {
          filter: { controller: "opponent", suspended: true, kind: ["Digimon"], superlative: "lowestDP" },
          count: 1,
        },
        condition: { kind: "stackHasSameLevelCards", count: 2 },
      });
    }
  });

  it("anchors the inherited security trash watcher to this Digimon's battle deletion", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
        },
      ],
    });
  });

  it("uses Q4903's repeated level to suspend and return the lowest-DP opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-047", as: "base" }],
          hand: [
            { card: "BT22-047", as: "sameLevel" },
            { card: "BT22-051", as: "okuwamon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("base").permanentId, [s.inst("sameLevel").instanceId]);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("okuwamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("trashes top security after its host survives and deletes in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-052", as: "host", under: ["BT22-051"] }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "defender", suspended: true }],
        security: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== defenderId));
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("implements Q4904 by not trashing security when the inherited source is also deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT22-051"], dp: 12000 }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "defender", suspended: true, dp: 12000 }],
        security: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
