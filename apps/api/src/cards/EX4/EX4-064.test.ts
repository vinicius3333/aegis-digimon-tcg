import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-064.js";
import "./index.js";

describe("EX4-064 Keenan Crier", () => {
  it("sets memory to three at start of turn when memory is two or less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions?.[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });
  });
  it("sets memory to three in the real start-of-turn window when memory is two", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-064", as: "tamer" }], security: ["BT1-009"] },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("leaves memory above two unchanged at the real start-of-turn window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-064", as: "tamer" }], security: ["BT1-009"] },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 6;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(6);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
  it("draws and may gain memory after qualifying purple Digimon deletion by suspending itself", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "GainMemory", amount: 1, condition: { kind: "triggerRemovalCause", removalCause: "byEffect" } },
      ],
      cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-064");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("draws and gains memory when a qualifying purple Digimon is deleted by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-064", as: "tamer" },
            { card: "EX4-058", as: "ravemon" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("ravemon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("draws and gains memory when an opponent publicly deletes Ravemon with an Option effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-064", as: "tamer" },
            { card: "EX4-058", as: "ravemon" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "red" }],
          hand: [{ card: "EX4-065", as: "tridentGaia" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tridentGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("ravemon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-013")).toBe(true);
    expect(s.state.memory).toBe(-1);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("does not trigger for a non-qualifying Digimon or when the Tamer is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-064", as: "tamer", suspended: true },
            { card: "BT1-010", as: "other" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand).not.toContainEqual(expect.objectContaining({ cardId: "BT1-013" }));
  });

  it("draws but does not gain memory when a qualifying Digimon is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-064", as: "tamer" },
            { card: "EX4-058", as: "ravemon" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("ravemon").permanentId], "byBattle");
    await settle(() => s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("plays itself for free when an opponent attack hits it in security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: [{ card: "BT1-009", as: "ownSecurityFiller" }],
        },
        1: {
          security: [
            { card: "EX4-064", as: "security" },
            { card: "BT1-010", as: "securityFiller" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("security").instanceId),
    );
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.instanceId)).toEqual([
      s.inst("security").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("securityFiller").instanceId]);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(false);
    expect(s.perm("attacker").isSuspended).toBe(true);
  });
  ex4CardBehaviorTests("EX4-064");
});
