import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-004.js";
import "../BT1/BT1-031.js";
import "../ST9/ST9-10.js";

describe("EX2-004 Gummymon", () => {
  it("matches the catalog and compiles the inherited once-per-turn watcher", () => {
    expect(getCardDefinition("EX2-004")).toMatchObject({
      cardId: "EX2-004",
      nameEn: "Gummymon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When an opponent's Digimon becomes suspended, ＜Draw 1＞. (Draw 1 card from your deck.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSuspended",
              sourceFilter: { controller: "opponent", kind: ["Digimon"] },
              actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("draws once when an opposing Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-026", as: "host", under: ["EX2-004"] }],
          hand: [{ card: "ST9-10", as: "suspender" }],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-002", as: "notDrawn" },
          ],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw when one of its controller's Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-026", as: "host", under: ["EX2-004"] }],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
  });

  it("does not draw when an opponent suspends its host during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-015", as: "host", under: ["EX2-004"] }],
          deck: [{ card: "BT1-011", as: "notDrawn" }],
        },
        1: {
          battleArea: [{ card: "EX2-014", as: "suspenderTarget" }],
          hand: [{ card: "ST9-10", as: "suspender" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notDrawn").instanceId)).toBe(true);
  });

  it("retains the watcher through a legal green evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: ["EX2-004"] }],
          hand: [
            { card: "EX2-026", as: "evolution" },
            { card: "ST9-10", as: "suspender" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }],
        },
        1: { battleArea: [{ card: "EX2-014", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("evolution").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX2-004", "BT1-064"]);
    expect(s.state.memory).toBe(8);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended && s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("reacts to a Blocker suspension, only once that turn, and resets on its next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-015", as: "host", under: ["EX2-004"] },
            { card: "EX2-015", as: "attacker1" },
            { card: "EX2-015", as: "attacker2" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-031", as: "firstBlocker" },
            { card: "BT1-031", as: "secondBlocker" },
            { card: "BT1-031", as: "thirdBlocker" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        },
      },
      { autoOrderTriggers: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const firstTurnHand = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("firstBlocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === firstTurnHand + 1);
    expect(s.state.players[0]!.hand.length).toBe(firstTurnHand + 1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length >= 2);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("secondBlocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.length).toBe(firstTurnHand + 1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const secondTurnHand = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length >= 3);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("thirdBlocker").permanentId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === secondTurnHand + 1);
    expect(s.state.players[0]!.hand.length).toBe(secondTurnHand + 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
