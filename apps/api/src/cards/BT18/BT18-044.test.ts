import { describe, expect, it } from "vitest";
import { assertNoLoudGap, type EngineSetup, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-087.js";
import "./BT18-046.js";
import { compiled } from "./BT18-044.js";

describe("BT18-044 FunBeemon", () => {
  it("places the exact Royal Base card from hand at security bottom and adds the prior top card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-044", as: "funbeemon" },
            { card: "BT18-046", as: "royalBase" },
          ],
          security: [{ card: "BT1-009", as: "topSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.instanceId === s.inst("royalBase").instanceId);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT18-046");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT18-046")).toBe(false);
    assertNoLoudGap(s);
  });

  it("declines the optional 'by' cost and keeps the Royal Base card and security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-044", as: "funbeemon" },
            { card: "BT18-046", as: "royalBase" },
          ],
          security: [{ card: "BT1-009", as: "topSecurity" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("royalBase").instanceId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("topSecurity").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("does nothing when the Royal Base placement cost has no eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-044", as: "funbeemon" }],
          security: [{ card: "BT1-009", as: "topSecurity" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("funbeemon").topCard?.cardId === "BT18-044");

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("topSecurity").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it.each([
    [true, 5000],
    [false, 4000],
  ])("face-up security=%s gives Royal Base Digimon %i DP", async (faceUp, expectedDp) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-046", as: "royalBase" }],
        security: [{ card: "BT18-044", as: "securityFunBeemon", faceUp }],
      },
    });
    await s.ready();

    expect(s.perm("royalBase").currentDP).toBe(expectedDp);
    assertNoLoudGap(s);
  });

  it("digivolves from a level 2 Royal Base for 0 and preserves the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-004", as: "puroromon" }],
        hand: [{ card: "BT18-044", as: "funbeemon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("puroromon").permanentId,
        instanceId: s.inst("funbeemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("puroromon").topCard?.instanceId === s.inst("funbeemon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("puroromon").stack.map(({ cardId }) => cardId)).toEqual(["BT18-004"]);
    assertNoLoudGap(s);
  });

  it("grants its inherited host +1000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-046", as: "host", under: [{ card: "BT18-044", as: "source" }] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});

describe("BT18-044 FunBeemon — KB Q&A rulings", () => {
  const GREYMON = "BT1-015";
  const MUCHOMON = "BT1-013";
  const BIYOMON = "BT1-012";
  const MONODRAMON = "BT1-009";
  const TK_TAKAISHI = "BT1-087";
  const WASPMON = "BT18-046";
  const FILLER = [MONODRAMON, BIYOMON, MUCHOMON];

  const attackPlayer = (s: EngineSetup, attackerAlias: string) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "player" },
    });

  it("a card placed face up in security stays revealed and is still a normal security card (Q2969)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-044", as: "funbeemon" },
            { card: WASPMON, as: "waspmon" },
          ],
          security: [
            { card: MONODRAMON, as: "topSecurity" },
            { card: WASPMON, as: "faceDownWaspmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.instanceId === s.inst("waspmon").instanceId);
    await s.ready();

    const security = s.state.players[0]!.security;
    expect(security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("faceDownWaspmon").instanceId,
      s.inst("waspmon").instanceId,
    ]);
    expect(security.map(({ faceUp }) => faceUp === true)).toEqual([false, true]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("topSecurity").instanceId]);
    // Both security cards are Waspmon; only the face-up one's [Security] [All Turns] applies: 1000 base + 1000.
    expect(s.perm("funbeemon").currentDP).toBe(2000);
    assertNoLoudGap(s);
  });

  it("checks a face-up security card like any other, revealed, and it battles with its own DP (Q2970)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GREYMON, as: "attacker" }], deck: [...FILLER], security: [...FILLER] },
        1: {
          security: [
            { card: MUCHOMON, as: "faceUpSecurity", faceUp: true },
            { card: BIYOMON, as: "faceDownSecurity" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const checkedId = s.inst("faceUpSecurity").instanceId;
    await s.ready();

    expect(attackPlayer(s, "attacker")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === checkedId));

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", seat: 1, revealedCardId: MUCHOMON, securityCardDP: 5000 }),
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityChecked", seat: 1, revealedCardId: MUCHOMON, resolution: "battle" }),
    );
    expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("faceDownSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(GREYMON);
    assertNoLoudGap(s);
  });

  it("a face-up security card's [Security] effect still activates when it is checked (Q2971)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GREYMON, as: "attacker" }], deck: [...FILLER], security: [...FILLER] },
        1: {
          security: [
            { card: TK_TAKAISHI, as: "faceUpTamer", faceUp: true },
            { card: BIYOMON, as: "faceDownSecurity" },
          ],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const tamerId = s.inst("faceUpTamer").instanceId;
    expect(s.state.players[1]!.security[0]?.faceUp).toBe(true);
    await s.ready();

    expect(attackPlayer(s, "attacker")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === tamerId));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([tamerId]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).not.toContain(tamerId);
    // The played Tamer's [On Play] then adds the remaining security card to the hand.
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("faceDownSecurity").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("shuffling a security stack turns its face-up cards face down (Q2972)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT18-044", as: "funbeemon" },
            { card: WASPMON, as: "placedWaspmon" },
            { card: TK_TAKAISHI, as: "shuffler" },
          ],
          deck: [...FILLER],
          security: [
            { card: MONODRAMON, as: "topSecurity" },
            { card: BIYOMON, as: "faceDownSecurity" },
            { card: WASPMON, as: "seededWaspmon", faceUp: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("funbeemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.at(-1)?.instanceId === s.inst("placedWaspmon").instanceId);
    await s.ready();
    expect(s.state.players[0]!.security.filter(({ faceUp }) => faceUp === true)).toHaveLength(2);
    expect(s.perm("funbeemon").currentDP).toBe(3000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === TK_TAKAISHI));
    await settle(() => s.state.players[0]!.security.every(({ faceUp }) => faceUp !== true));
    await s.ready();

    const securityIds = s.state.players[0]!.security.map(({ instanceId }) => instanceId);
    expect(securityIds).toHaveLength(2);
    expect(
      securityIds.some((id) => id === s.inst("placedWaspmon").instanceId || id === s.inst("seededWaspmon").instanceId),
    ).toBe(true);
    expect(s.state.players[0]!.security.map(({ faceUp }) => faceUp === true)).toEqual(securityIds.map(() => false));
    expect(s.perm("funbeemon").currentDP).toBe(1000);
    assertNoLoudGap(s);
  });
});
