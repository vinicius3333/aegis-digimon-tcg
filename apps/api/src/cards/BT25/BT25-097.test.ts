import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { syncPublicCounts } from "../../engine/state/visibility.js";
import { setupEngine, settle, type SetupEngineOptions } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT25-097 Guardian Palace", () => {
  it("with zero security waives color, places itself face up and continues to the reduced play (Q6457-Q6458)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-097", as: "palace" },
            { card: "BT25-034", as: "tsTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const palaceId = s.inst("palace").instanceId;
    const targetId = s.inst("tsTarget").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: palaceId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === targetId));
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: palaceId, faceUp: true }),
    );
    expect(s.state.memory).toBe(5);
  });

  it("face-up Security grants Alliance only to yellow/purple TS and Scapegoat while Junomon exists (Q6463)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT25-097", faceUp: true }],
        battleArea: [
          { card: "BT25-033", as: "eligible" },
          { card: "BT25-007", as: "wrongTrait" },
          { card: "BT25-044", as: "junomon", under: [{ card: "BT25-039" }] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Scapegoat")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("wrongTrait"), "Alliance")).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("eligible"), "Scapegoat")).toBe(true);
  });

  it("Security plays exactly 1 level-4-or-lower yellow/purple TS from hand or trash for free", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-097", as: "checkedPalace", faceUp: true }],
          trash: [
            { card: "BT25-033", as: "eligible" },
            { card: "BT25-044", as: "levelSix" },
          ],
          hand: [{ card: "BT25-007", as: "wrongTrait" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("checkedPalace"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT25-033")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT25-044")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-007")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("allows declining the optional Security play", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-097", as: "checkedPalace", faceUp: true }],
          hand: [{ card: "BT25-033", as: "eligible" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();

    const resolving = advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("checkedPalace"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("eligible").instanceId)).toBe(true);
  });

  it("adds the bottom security card and places itself face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-097", as: "palace" }],
          security: [{ card: "BT25-001" }, { card: "BT25-002", as: "bottomSecurity" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const palaceId = s.inst("palace").instanceId;
    const bottomSecurityId = s.inst("bottomSecurity").instanceId;
    type PlayCardIntentWithUseAs = Parameters<typeof s.engine.applyIntent>[1] & { useAs?: "digimon" | "option" };

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: palaceId,
        useAs: "option",
      } as PlayCardIntentWithUseAs),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === palaceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === bottomSecurityId)).toBe(true);
    expect(s.state.players[0]!.security.find((card) => card.instanceId === palaceId)).toMatchObject({
      instanceId: palaceId,
      faceUp: true,
    });
  });

  it("publicly declines the reduced play after moving the bottom security card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-097", as: "palace" },
            { card: "BT25-034", as: "candidate" },
          ],
          security: [{ card: "BT25-001" }, { card: "BT25-002", as: "bottom" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palace").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({
      instanceId: s.inst("palace").instanceId,
      faceUp: true,
    });
  });

  it("does not waive color when a security card is already face up", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT25-097", as: "palace" }], security: [{ card: "BT25-095", faceUp: true }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("palace").instanceId, useAs: "option" } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});

describe("BT25-097 Guardian Palace — KB Q&A rulings", () => {
  const AREA = "BT25-097";

  /** The opponent attacks while this card is the face-up top security card. */
  async function attackIntoFaceUpArea(options: SetupEngineOptions) {
    const s = setupEngine(
      {
        0: {
          security: [{ card: AREA, as: "area", faceUp: true }, "BT1-009"],
          trash: [{ card: "BT25-034", as: "eligible" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
      },
      options,
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: AREA, faceUp: true });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    return s;
  }

  it("stays a revealed security card that otherwise counts like any other after its [Main] places it (Q6459)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: AREA, as: "area" }],
          security: [
            { card: "BT1-009", as: "top" },
            { card: "BT1-010", as: "bottom" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const areaId = s.inst("area").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: areaId, useAs: "option" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === areaId));
    syncPublicCounts(s.state);

    const player = s.state.players[0]!;
    expect(player.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [s.inst("top").instanceId, false],
      [areaId, true],
    ]);
    expect(player.securityCount).toBe(2);
    expect(player.securityView.map((view) => [view.faceUp, view.cardId])).toEqual([
      [false, ""],
      [true, AREA],
    ]);
    expect(player.hand.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
  });

  it("is security checked while left revealed, like a face-down card (Q6460)", async () => {
    const s = await attackIntoFaceUpArea({ autoDeclineOptional: true });

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityChecked", seat: 0, revealedCardId: AREA }),
    );
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain(AREA);
  });

  it("activates its [Security] effect when checked face up (Q6461)", async () => {
    const s = await attackIntoFaceUpArea({ autoAcceptOptional: true, autoSelectCards: true });

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", revealedCardId: AREA, hasSecurityEffect: true }),
    );
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("eligible").instanceId,
      ),
    ).toBe(true);
  });

  it("turns face down when an effect shuffles the security stack (Q6462)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-029", as: "airdramon" }],
          security: [{ card: "BT1-009", as: "added" }, { card: AREA, as: "area", faceUp: true }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("added").instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("airdramon"));
    await settle(() => s.state.players[0]!.hand.length === 1);

    const security = s.state.players[0]!.security;
    expect(security.map((card) => card.cardId).sort()).toEqual([AREA, "BT1-010"].sort());
    expect(security.every((card) => card.faceUp === false)).toBe(true);
  });
});
