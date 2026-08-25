import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-047.js";
import "./index.js";

describe("BT22-047 Kuwagamon", () => {
  it("suspends one opponent Digimon and conditionally restricts unsuspension", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        condition: { kind: "stackHasSameLevelCards", count: 2 },
      });
    }
  });

  it("anchors the inherited battle deletion watcher to this Digimon", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });

  it("uses Q4898's repeated level to suspend and lock an opponent through their turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", as: "base", under: ["BT22-043"] }],
          hand: [{ card: "BT22-047", as: "kuwagamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuwagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("gains 1 memory when its surviving host deletes an opponent in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-052", as: "host", under: ["BT22-047"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true }] },
    });
    await s.ready();
    s.state.memory = 0;
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

    expect(s.state.memory).toBe(1);
  });

  it("implements Q4900 by not gaining memory when both battling Digimon are deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT22-047"], dp: 12000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true, dp: 12000 }] },
    });
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
  });
});
