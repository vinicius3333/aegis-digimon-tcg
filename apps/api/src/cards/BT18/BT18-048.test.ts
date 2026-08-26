import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-048.js";

describe("BT18-048 Kazemon", () => {
  it("suspends the exact opposing Digimon when digivolving from Zoe Orimoto", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      { trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }] },
      { trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", reduceCost: 1 }] },
      {
        trigger: "AllTurns",
        isInherited: true,
        actions: [{ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanYourEffect" }],
      },
    ]);
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-090", as: "zoe" }], hand: [{ card: "BT18-048", as: "kazemon" }] },
      1: { battleArea: [{ card: "BT1-030", as: "opponentTarget" }] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("zoe").permanentId,
        instanceId: s.inst("kazemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("zoe").topCard?.cardId === "BT18-048");
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("zoe"));

    expect(s.perm("zoe").topCard?.cardId).toBe("BT18-048");
    expect(s.perm("opponentTarget").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });

  it("uses the zero-cost Zephyrmon evolution route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-049", as: "zephyrmon" }], hand: [{ card: "BT18-048", as: "kazemon" }] },
      1: { battleArea: [{ card: "BT1-030", as: "target" }] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("zephyrmon").permanentId,
        instanceId: s.inst("kazemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("zephyrmon").topCard?.cardId === "BT18-048");

    expect(s.state.memory).toBe(5);
    expect(s.perm("zephyrmon").stack.at(-1)?.cardId).toBe("BT18-049");
    assertNoLoudGap(s);
  });

  it("digivolves a friendly Digimon into a green Hybrid for 1 less on its first attack", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-048", as: "kazemon" },
            { card: "BT18-045", as: "base" },
            { card: "BT18-045", as: "secondBase" },
          ],
          hand: [
            { card: "BT18-047", as: "hybrid" },
            { card: "BT18-047", as: "secondHybrid" },
          ],
        },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("base").topCard!.instanceId, s.inst("hybrid").instanceId);
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kazemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-047");

    expect(s.state.memory).toBe(4);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT18-045");

    await advance(s.engine).verb.unsuspend([s.perm("kazemon").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kazemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("secondBase").topCard?.cardId).toBe("BT18-045");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("secondHybrid").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("plays an inherited-effect Tamer from its host stack when an opponent effect removes it", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-090", "BT18-048"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const tamerId = s.perm("host").stack.find(({ cardId }) => cardId === "BT18-090")!.instanceId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === tamerId));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === tamerId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not activate the inherited replacement for its owner's effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-060", as: "host", under: ["BT18-090", "BT18-048"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    try {
      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT18-090");
    assertNoLoudGap(s);
  });
});
