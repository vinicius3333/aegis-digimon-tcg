import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-001.js";
import "./EX6-009.js";
import "./EX6-002.js";
import "../BT8/BT8-084.js";

describe("EX6-001 Sakuttomon", () => {
  it("registers an inherited continuous Legend-Arms add-to-stack watcher", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("onAddDigivolutionCards");
    expect(text).toContain("byEffect");
    expect(text).toContain("Legend-Arms");
    expect(text).toContain("OncePerTurn");
  });

  it("gains memory only when the newly placed card is Legend-Arms", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-020", as: "host", under: ["EX6-001", "BT1-009", "BT1-015"] }],
          hand: [
            { card: "BT1-010", as: "nonLegendArms" },
            { card: "BT1-010", as: "secondNonLegendArms" },
            { card: "EX6-009", as: "legendArms" },
            { card: "EX6-009", as: "secondLegendArms" },
            { card: "EX6-009", as: "thirdLegendArms" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        1: { deck: Array(10).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("secondNonLegendArms").instanceId]);
    expect(s.state.memory).toBe(5);
    const [effect] = JSON.parse(s.inst("legendArms").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("legendArms").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);

    const [secondEffect] = JSON.parse(s.inst("secondLegendArms").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
    }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("secondLegendArms").instanceId,
        effectKey: secondEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforeResetPlacement = s.state.memory;
    const [thirdEffect] = JSON.parse(s.inst("thirdLegendArms").activatableEffectsJson || "[]") as Array<{
      effectKey: string;
    }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("thirdLegendArms").instanceId,
        effectKey: thirdEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === memoryBeforeResetPlacement - 1);
    expect(s.state.memory).toBe(memoryBeforeResetPlacement - 1);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("does not gain memory when Kimeramon DNA attack places a non-Legend-Arms blue level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-014", as: "redLv4", under: ["EX6-001", "BT1-009"] },
            { card: "BT1-037", as: "blueLv4", under: ["EX6-002", "BT12-021"] },
          ],
          hand: [
            { card: "BT8-084", as: "kimeramon" },
            { card: "BT12-021", as: "blueLv3" },
          ],
          deck: Array(10).fill("BT1-009"),
        },
        1: {
          deck: Array(10).fill("BT1-009"),
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 5;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const deckBeforeDna = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("redLv4").permanentId, s.perm("blueLv4").permanentId],
        instanceId: s.inst("kimeramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("kimeramon").instanceId,
        ) && s.state.pendingDecision === undefined,
    );

    const kimeramon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("kimeramon").instanceId,
    )!;
    expect(kimeramon.topCard.cardId).toBe("BT8-084");
    expect(kimeramon.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-014", "EX6-001", "BT1-009", "BT1-037", "EX6-002", "BT12-021"]),
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeDna - 1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("blueLv3").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: kimeramon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 2 &&
        kimeramon.stack.some(({ instanceId }) => instanceId === s.inst("blueLv3").instanceId) &&
        s.state.pendingDecision === undefined,
    );

    expect(kimeramon.stack.map(({ cardId }) => cardId)).toContain("BT12-021");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("blueLv3").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    await advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
