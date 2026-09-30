import { describe, expect, it } from "vitest";
import { setupEngine, settle, type CardSpec } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT22-100.js";
import "../index.js";

describe("BT22-100 Cyberspace EDEN", () => {
  it("waives its color requirement only while there are no face-up security cards", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(effect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHaveNone",
        filter: { zone: "security", faceUp: true },
      },
    });
  });

  it("adds the bottom security card to hand, then places itself face up at the bottom", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", toTop: false },
      { kind: "SecurityManipulation", op: "placeAsSecurity", controller: "mine", toTop: false, faceUp: true },
    ]);
  });

  it("grants the CS DP boost from Security and allows a free CS play", () => {
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
  });

  it("moves bottom security to hand and places the physical Option face up at security bottom", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT22-100", as: "eden" }],
        battleArea: ["BT22-091"],
        security: [
          { card: "BT1-009", as: "top" },
          { card: "BT1-010", as: "bottom" },
        ],
      },
    });
    const edenId = s.inst("eden").instanceId;
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: edenId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === edenId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomId)).toBe(true);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: edenId, faceUp: true });
  });

  it("plays a qualifying CS card from hand when revealed as Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT22-100", as: "eden" }],
          hand: [{ card: "BT22-091", as: "arata" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("eden"));
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091"),
      400,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(true);
  });
});

describe("BT22-100 Cyberspace EDEN — KB Q&A rulings", () => {
  async function useEden(security: CardSpec[]) {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT22-100", as: "eden" }], security, deck: ["BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eden").instanceId });
    await settle(() => s.state.pendingDecision === undefined);
    return Object.assign(s, { result });
  }

  async function opponentAttacksPlayer(security: CardSpec[], attackerDp: number) {
    const s = setupEngine(
      { 0: { security }, 1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: attackerDp }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    return s;
  }

  it('meets "while you have no face-up security cards" with 0 security cards (Q4971)', async () => {
    const empty = await useEden([]);
    expect(empty.result).toEqual({ ok: true });
    expect(empty.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [empty.inst("eden").instanceId, true],
    ]);

    const faceUp = await useEden([{ card: "BT1-009", faceUp: true }]);
    expect(faceUp.result).toMatchObject({ ok: false });
  });

  it("keeps a card it placed face up as a revealed, otherwise ordinary security card (Q4972)", async () => {
    const s = await useEden([
      { card: "BT1-009", as: "top" },
      { card: "BT1-010", as: "bottom" },
    ]);

    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [s.inst("top").instanceId, false],
      [s.inst("eden").instanceId, true],
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
  });

  it("checks a face-up security Digimon like any other, including its security battle (Q4973)", async () => {
    const s = await opponentAttacksPlayer([{ card: "BT1-010", as: "revealed", faceUp: true }, "BT1-011"], 1000);

    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("revealed").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("triggers the [Security] effect of a face-up security card when it is checked (Q4974)", async () => {
    const s = await opponentAttacksPlayer([{ card: "BT22-083", as: "yuuko", faceUp: true }, "BT1-011"], 1000);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("yuuko").instanceId,
    ]);
  });

  it("turns face-up security cards face down when the security stack is shuffled (Q4975)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT7-088", as: "zoe" }],
          security: [{ card: "BT22-100", faceUp: true }, "BT1-009", { card: "BT1-010", faceUp: true }],
          deck: ["BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.state.players[0]!.security.filter((card) => card.faceUp)).toHaveLength(2);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("zoe").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.filter((card) => card.faceUp)).toHaveLength(0);
  });
});
