import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-064.js";

describe("EX6-064 Shu-Chong Wong", () => {
  it("reveals three for Beast-family cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ count: 1, to: "hand" }],
      rest: "deckBottom",
    }));
  it("watches any own effect-suspended Digimon, then suspends this Tamer to reduce evolution by two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenEffectSuspends",
      triggerFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 2, cost: { kind: "suspend" } }],
    });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });
  it("publicly reveals three cards and adds one Beast-family card", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-064", as: "shu" }], deck: ["BT1-035", "BT1-009", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shu").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("shu") !== undefined);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-035")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("publicly plays Shu-Chong and returns three revealed near-misses to the deck bottom", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-064", as: "shu" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shu").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("shu") !== undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });

  it("plays Shu-Chong from security when an opponent attacks", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX6-064", as: "securityShu" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("securityShu").instanceId),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("publicly digivolves a different own Digimon after an effect suspends one, paying the reduced cost", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-064", as: "shu" },
            { card: "BT1-009", as: "suspendedSubject" },
            { card: "EX6-032", as: "target" },
          ],
          hand: [{ card: "EX6-033", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("target").topCard!.instanceId, s.inst("evolution").instanceId);

    await advance(s.engine).verb.suspend([s.perm("suspendedSubject").permanentId], 0);
    await settle(() => s.perm("target").topCard?.cardId === "EX6-033");

    expect(s.perm("suspendedSubject").isSuspended).toBe(true);
    expect(s.perm("target").topCard?.cardId).toBe("EX6-033");
    expect(s.perm("target").stack.map((card) => card.cardId)).toContain("EX6-032");
    expect(s.perm("shu").isSuspended).toBe(true);
    expect(s.state.memory).toBe(9); // EX6-033's cost 3, reduced by 2, so 1 memory is paid.
  });

  it("does not ignore ordinary evolution requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-064", as: "shu" },
            { card: "BT1-010", as: "suspendedSubject" },
            { card: "BT1-009", as: "invalidTarget" },
          ],
          hand: [{ card: "EX6-033", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("suspendedSubject").permanentId], 0);
    await settle();

    expect(s.perm("invalidTarget").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("shu").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
  });
});
