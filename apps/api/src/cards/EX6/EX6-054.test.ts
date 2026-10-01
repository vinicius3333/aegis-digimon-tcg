import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-054.js";

describe("EX6-054 Lucemon: Chaos Mode", () => {
  it("deletes an opposing Digimon/Tamer, or trashes security and grants Recovery when deletion fails", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", optional: true, controller: "opponent" },
      { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "ifThisEffectDidNotDelete" } },
      {
        kind: "GainKeyword",
        keyword: { keyword: "Recovery", amount: 1 },
        condition: { kind: "ifThisEffectDidNotDelete" },
      },
    ]));
  it("binds the optional Lucemon return cost to its own stack before the optional revival", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "instead",
      optional: true,
      cost: {
        kind: "return",
        to: "deckBottom",
        target: {
          filter: {
            zone: ["trash", "digivolutionCards"],
          },
          source: "thisDigimon",
        },
      },
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    }));
  it("publicly plays from hand, pays 13, and deletes an opposing Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX6-054", as: "chaos" }] }, 1: { battleArea: [{ card: "BT1-009", as: "victim" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("chaos").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chaos").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("uses the alternate Lucemon evolution, pays 6 memory, and resolves the no-delete recovery branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          hand: [{ card: "EX6-054", as: "chaos" }],
          deck: [
            { card: "BT1-010", as: "drawn" },
            { card: "BT1-009", as: "recovery" },
          ],
          security: ["BT1-009"],
        },
        1: { security: [{ card: "BT1-009", as: "opponentSecurity" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lucemon").permanentId,
        instanceId: s.inst("chaos").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lucemon").topCard.cardId === "EX6-054");

    expect(s.perm("lucemon").stack.map((card) => card.cardId)).toEqual(["EX10-013"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
  });

  it("publicly pays the leave replacement by bottom-decking its Lucemon stack card and plays Satan Mode", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-054", as: "chaos", under: [{ card: "EX10-013", as: "lucemon" }] }],
          trash: [{ card: "EX10-060", as: "satan" }],
          deck: [{ card: "BT1-009", as: "deck" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("chaos").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("satan").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("satan").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["EX10-060"]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chaos").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deck").instanceId,
      s.inst("lucemon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("satan").instanceId)).toBe(false);
  });

  it("declines the optional leave replacement without paying or playing from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-054", as: "chaos", under: [{ card: "EX10-013", as: "lucemon" }] }],
          trash: [{ card: "EX10-060", as: "satan" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("chaos").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("chaos").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("satan").instanceId)).toBe(true);
  });

  it("requires an exact Lucemon card for the replacement payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-054", as: "chaos", under: [{ card: "EX10-060", as: "nearMatch" }] }],
          trash: [{ card: "EX10-060", as: "satan" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("chaos").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("nearMatch").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("satan").instanceId)).toBe(true);
  });

  it("rejects a non-Lucemon red level 4 as an illegal alternate evolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "EX6-054", as: "chaos" }] },
    });
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chaos").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

describe("EX6-054 Lucemon: Chaos Mode — KB Q&A rulings", () => {
  async function playChaosMode(opponentBattleArea: { card: string; as: string }[]) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX6-054", as: "chaos" }],
          deck: [{ card: "BT1-010", as: "recovery" }],
          security: ["BT1-009"],
        },
        1: {
          battleArea: opponentBattleArea,
          security: [{ card: "BT1-009", as: "opponentSecurity" }],
          deck: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    return s;
  }

  it("gives <Recovery +1 (Deck)> to the player who activated the effect (Q3787)", async () => {
    const s = await playChaosMode([]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("resolves the no-delete branch when the opponent picks a Digimon unaffected by the effect (Q3788)", async () => {
    const s = await playChaosMode([{ card: "BT1-009", as: "immune" }]);
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("immune").permanentId,
      "beAffected",
      EffectDuration.Permanent,
      { byOpponentEffectsOnly: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.instanceId)).toEqual([
      s.inst("immune").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponentSecurity").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("recovery").instanceId);
  });

  it.each([
    [
      "trash",
      (s: ReturnType<typeof setupEngine>) =>
        advance(s.engine).verb.deletePermanent([s.perm("chaos").permanentId], "byEffect"),
    ],
    ["hand", (s: ReturnType<typeof setupEngine>) => advance(s.engine).verb.returnToHand([s.inst("chaos").instanceId])],
    ["deck", (s: ReturnType<typeof setupEngine>) => advance(s.engine).verb.returnToDeck([s.inst("chaos").instanceId])],
  ] as const)("triggers its would-leave effect when it moves to the %s (Q3789)", async (_route, move) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-054", as: "chaos", under: [{ card: "EX10-013", as: "lucemon" }] }],
          trash: [{ card: "EX10-060", as: "satan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await move(s);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toEqual([
      s.inst("satan").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("lucemon").instanceId);
  });

  it("lets the player pay the Lucemon return and still choose not to play from trash (Q3790)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-054", as: "chaos", under: [{ card: "EX10-013", as: "lucemon" }] }],
          trash: [{ card: "EX10-060", as: "satan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Play without paying the cost"] },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("chaos").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(s.decisions.map(({ req }) => req.promptText)).toEqual(["Use this effect?", "Play without paying the cost"]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("lucemon").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("satan").instanceId, s.inst("chaos").instanceId]),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("asks the opponent, not the controller, whether and what to delete", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-054", as: "chaos" }] },
        1: { battleArea: ["BT1-009", "BT1-010"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    const deleteDecisions = s.decisions.filter(({ req }) => req.kind === "optional" || req.kind === "chooseTargets");
    expect(deleteDecisions.map(({ req }) => req.kind)).toEqual(["optional", "chooseTargets"]);
    expect(deleteDecisions.map(({ seat }) => seat)).toEqual([1, 1]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
