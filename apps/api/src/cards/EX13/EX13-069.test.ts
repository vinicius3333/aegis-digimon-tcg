import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as EX13_069 } from "./EX13-069.js";
import "../index.js";

const CARD_ID = "EX13-069";

const STARTING_MEMORY = 3;
const MEMORY_AFTER_FREE_DIGIVOLVE = STARTING_MEMORY + 1;

describe("EX13-069 Rina Shinomiya", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Rina Shinomiya",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["CS"],
    });
  });

  it("maps every printed clause onto IR", () => {
    expect(EX13_069.coverage).toBe("full");
    expect(EX13_069.residual).toEqual([]);

    expect(EX13_069.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "youHave",
        filter: {
          kind: ["Digimon"],
          zone: "battleArea",
          nameOrTrait: [{ tokens: ["Veemon", "Veedramon"], match: "name" }],
        },
      },
    });

    const watcher = EX13_069.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("[Your Turn] action is not a SubTrigger");
    expect(watcher).toMatchObject({
      event: "whenUnsuspended",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
      optional: true,
      abortOnDecline: true,
    });
    expect(watcher.actions[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
    expect(watcher.actions[1]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }] },
      from: ["hand"],
      payCost: true,
      reduceCost: 2,
      optional: true,
    });

    expect(EX13_069.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
  });

  it("gains 1 memory at the start of your main phase with a [Veemon]-named Digimon out", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT3-021", as: "veemon", suspended: false },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("counts [ExVeemon] — the name clause is a substring match, not an exact name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "EX1-014", as: "exVeemon" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.state.memory).toBe(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("refuses [Vemmon] (near-match) and an unrelated Digimon — no memory at all", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT18-060", as: "vemmon" },
            { card: "BT1-009", as: "monodramon" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("ignores a [Veemon]-named Digimon that is only in the breeding area (§3-4-5-8)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rina" }],
          breeding: { card: "BT3-021", as: "inBreeding" },
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("rina"));
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(s.inst("inBreeding").instanceId);
  });

  it("does not fire on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT3-021", as: "veemon" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle();

    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("suspends itself, draws 1 and digivolves a Digimon into a [Veedramon] card for 2 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT3-021", as: "veemon", suspended: true },
          ],
          hand: [
            { card: "ST8-05", as: "veedramon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = STARTING_MEMORY;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("veemon").topCard.instanceId === s.inst("veedramon").instanceId);
    await settle();

    const board = s.state.players[0]!;
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("veedramon").instanceId);
    expect(s.perm("veemon").stack.map((card) => card.instanceId)).toEqual([s.inst("veemon").instanceId]);
    expect(s.perm("rina").isSuspended).toBe(true);
    expect(board.deck).toHaveLength(1);
    expect(board.hand).toHaveLength(3);
    expect(board.hand.map((card) => card.instanceId)).not.toContain(s.inst("veedramon").instanceId);
    expect(board.hand.map((card) => card.instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.state.memory).toBe(MEMORY_AFTER_FREE_DIGIVOLVE);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("charges the printed digivolution cost minus 2 (BT1-115's cost 3 becomes 1)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT3-021", as: "veemon", suspended: true },
          ],
          hand: [
            { card: "BT1-115", as: "veedramon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = STARTING_MEMORY;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("veemon").topCard.instanceId === s.inst("veedramon").instanceId);
    await settle();

    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("veedramon").instanceId);
    expect(s.state.memory).toBe(MEMORY_AFTER_FREE_DIGIVOLVE - 1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("Q7437 does nothing after the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT3-021", as: "veemon", suspended: true },
          ],
          hand: [
            { card: "ST8-05", as: "veedramon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.perm("rina").isSuspended).toBe(false);
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("veemon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("veedramon").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("Q7438 still digivolves but pays full cost while Syakomon blocks digivolution-cost reductions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT3-021", as: "veemon", suspended: true },
          ],
          hand: [{ card: "BT1-115", as: "veedramon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT5-021", as: "syakomon" }], deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = STARTING_MEMORY;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("veemon").permanentId]);
    await settle(() => s.perm("veemon").topCard.instanceId === s.inst("veedramon").instanceId);
    await settle();

    expect(s.perm("rina").isSuspended).toBe(true);
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("veedramon").instanceId);
    expect(s.state.memory).toBe(STARTING_MEMORY - 3);
  });

  it("Q7439 does not combine two Rina reductions onto one digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rinaA" },
            { card: CARD_ID, as: "rinaB" },
            { card: "BT3-021", as: "veemon", suspended: true },
          ],
          hand: [{ card: "BT1-115", as: "veedramon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = STARTING_MEMORY;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("veemon").permanentId]);
    await settle(() => s.perm("veemon").topCard.instanceId === s.inst("veedramon").instanceId);
    await settle();

    expect(s.perm("rinaA").isSuspended).toBe(true);
    expect(s.perm("rinaB").isSuspended).toBe(true);
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("veedramon").instanceId);
    expect(s.state.memory).toBe(STARTING_MEMORY - 1);
  });

  it("draws but cannot digivolve when the only hand card is not [Veedramon]-named", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT3-021", as: "veemon", suspended: true },
          ],
          hand: [
            { card: "BT3-025", as: "exVeemon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.deck.length === 2);
    await settle();

    expect(s.perm("rina").isSuspended).toBe(true);
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("veemon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("exVeemon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("draws but cannot digivolve from an illegal base (red Lv.3 under a blue Lv.4 EvoCost)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina" },
            { card: "BT1-009", as: "monodramon", suspended: true },
          ],
          hand: [
            { card: "ST8-05", as: "veedramon" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.deck.length === 2);
    await settle();

    expect(s.perm("rina").isSuspended).toBe(true);
    expect(s.perm("monodramon").topCard.instanceId).toBe(s.inst("monodramon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("veedramon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not fire for the opponent's unsuspending Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rina" }],
          hand: [{ card: "ST8-05", as: "veedramon" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT3-021", as: "theirVeemon", suspended: true }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle();

    expect(s.perm("theirVeemon").isSuspended).toBe(false);
    expect(s.perm("rina").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("veedramon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("ignores an opponent's Digimon unsuspending during your own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rina" }],
          hand: [
            { card: "ST8-05", as: "veedramon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT3-021", as: "theirVeemon", suspended: true }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("theirVeemon").permanentId]);
    await settle();

    expect(s.perm("theirVeemon").isSuspended).toBe(false);
    expect(s.perm("rina").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("veedramon").instanceId);
  });

  it("cannot pay the cost while this Tamer is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rina", suspended: true },
            { card: "BT3-021", as: "veemon", suspended: true },
          ],
          hand: [
            { card: "ST8-05", as: "veedramon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("veemon").permanentId]);
    await settle();

    expect(s.perm("veemon").isSuspended).toBe(false);
    expect(s.perm("rina").isSuspended).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.perm("veemon").topCard.instanceId).toBe(s.inst("veemon").instanceId);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "rina" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("rina"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rina").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("rina").instanceId,
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("rina").instanceId);
  });

  it("publicly plays itself from security after an opponent attack, free of memory cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: CARD_ID, as: "rina" },
            { card: "BT1-011", as: "remainingSecurity" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-012", as: "spare" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const rinaId = s.inst("rina").instanceId;
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(rinaId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(rinaId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
