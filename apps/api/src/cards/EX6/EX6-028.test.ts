import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-028.js";
import "../BT1/BT1-060.js";

describe("EX6-028 Seraphimon", () => {
  it("has Blast Digivolve and Recovery +1 on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(
      compiled.effects
        ?.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving")
        .every((entry) => entry.keywords?.[0]?.keyword === "Recovery"),
    ).toBe(true);
  });
  it("returns an opposing Digimon based on your security additions once per turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAddSecurity",
      fireCondition: { kind: "triggerSecurityIsYours" },
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: {
            filter: {
              controller: "opponent",
              levelComparison: { op: "lte", value: 0, scaling: { unit: "security", per: 1 } },
            },
          },
        },
      ],
    }));
  it("publicly recovers one card from the deck on play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX6-028", as: "sera" }], deck: [{ card: "BT1-009", as: "recovery" }] },
    });
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sera").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-028"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("publicly returns an opposing low-level Digimon when your security increases", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-028", as: "sera" }],
          deck: [{ card: "BT1-009", as: "recovery" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sera").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponent").instanceId));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponent").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not return an opposing Digimon above the security-count level boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-028", as: "sera" }],
          deck: [{ card: "BT1-009", as: "recovery" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sera").instanceId })).toEqual({ ok: true });
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("opponent").instanceId),
    ).toBe(true);
  });

  it("does not react to an opponent's security increase and resolves only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-028", as: "sera" }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          security: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            { card: "BT1-060", as: "ownRecovery" },
            { card: "BT1-060", as: "sameTurnRecovery" },
            { card: "BT1-060", as: "resetRecovery" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetA" },
            { card: "BT1-009", as: "targetB" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          security: [{ card: "BT1-060", as: "opponentRecovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.playFromSecurity(s.inst("opponentRecovery").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(3);
    // The first own security addition arms the watcher; subsequent additions in this turn
    // must not retrigger it.
    await advance(s.engine).verb.playFromSecurity(s.inst("ownRecovery").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    await advance(s.engine).verb.playFromSecurity(s.inst("sameTurnRecovery").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.playFromSecurity(s.inst("resetRecovery").instanceId);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
