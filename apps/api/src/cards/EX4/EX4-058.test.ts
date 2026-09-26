import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-058.js";

describe("EX4-058 Ravemon", () => {
  it("can delete itself at end of the opponent's turn to play Ravemon from trash", () => {
    const clause = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack");
    expect(clause?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "endOfOpponentTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          from: ["trash"],
          target: {
            location: "trash",
            controller: "mine",
            filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Ravemon"] }] },
          },
        },
      ],
    });
    expect(clause?.cost).toMatchObject({
      kind: "deleteOwn",
      target: {
        filter: {
          isSelfRef: true,
          digivolutionStackNameOrTrait: [
            { match: "traitContains", tokens: ["Bird"] },
            { match: "traitContains", tokens: ["Avian"] },
          ],
        },
      },
    });
  });
  it("trashes an opponent hand card at eight or more cards, otherwise adds security to hand", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "Trash",
      target: { chooser: "opponent" },
      condition: { kind: "zoneCount", op: "gte", value: 8 },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "toHand",
      condition: { kind: "zoneCount", op: "lte", value: 7 },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-058");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("deletes itself from an Avian stack and plays Ravemon at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-058", as: "source", under: ["EX4-056"] }],
          trash: [{ card: "EX4-058", as: "ravemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX4-058")).not.toHaveLength(0);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-058"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-058")).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX4-058")).toHaveLength(1);
  });

  it("pays its End of Attack cost after a public attack from an Avian stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-058", as: "source", under: ["EX4-056"] }],
          trash: [{ card: "EX4-058", as: "ravemon" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: sourceId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await advance(s.engine).finishAttack();
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== sourceId));
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX4-058")).toBe(true);

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-058")).toBe(true);
  });

  it("does not pay its End of Attack cost after a public attack without a Bird or Avian source", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-058", as: "source", under: ["BT1-010"] }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: sourceId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await advance(s.engine).finishAttack();
    await settle();
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not activate the end-of-attack cost without a Bird or Avian evolution card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX4-058", as: "source", under: ["BT1-010"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"));
    await settle(() => false, 60);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("source").permanentId)).toBe(true);
  });

  it("does not play a longer Ravemon name from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-058", as: "source", under: ["EX4-056"] }],
          trash: [{ card: "BT13-092", as: "longRavemonName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await settle();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("longRavemonName").instanceId);
  });

  it("trashes one card at eight cards, then recovers security after the opponent falls to seven", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-058", as: "source" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [...Array(8).fill("BT1-009"), { card: "EX4-065", as: "tridentGaia" }],
          security: [{ card: "BT1-013", as: "security" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tridentGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId) &&
        s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("security").instanceId),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("tridentGaia").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(1);
  });

  it("adds security to hand without trashing when the opponent has six cards after using an Option", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-058", as: "source" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [...Array(6).fill("BT1-009"), { card: "EX4-065", as: "tridentGaia" }],
          security: [{ card: "BT1-013", as: "security" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tridentGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("source").instanceId) &&
        s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("security").instanceId),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("tridentGaia").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(7);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(0);
  });
  it("has a printed ＜Jamming＞ on its main side", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-058", as: "host" }] }, 1: {} });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("survives a stronger Security Digimon through its printed Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX4-058", as: "ravemon" }], deck: ["BT1-009"] },
      1: { security: ["BT1-080"], deck: ["BT1-009"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("ravemon"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ravemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("ravemon").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX4-058")).toBe(false);
  });
  ex4CardBehaviorTests("EX4-058");
});
