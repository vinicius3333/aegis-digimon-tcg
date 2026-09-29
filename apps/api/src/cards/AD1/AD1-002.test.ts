import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-002 Aldamon", () => {
  it("deletes an opposing Digimon within its DP ceiling when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "base" }], hand: [{ card: "AD1-002", as: "aldamon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 8000 },
            { card: "BT1-010", as: "tooLarge", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aldamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId),
    ).toBe(true);
  });

  it("digivolves from Takuya with 2 Hybrid cards under it and can attack immediately with Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-020", as: "takuya", under: ["BT12-009", "BT12-009"] }],
          hand: [{ card: "AD1-002", as: "aldamon" }],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("aldamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "AD1-002");
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("rejects the Takuya route when fewer than 2 Hybrid cards are underneath", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-020", as: "takuya", under: ["BT12-009"] }],
        hand: [{ card: "AD1-002", as: "aldamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("aldamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("takuya").topCard?.cardId).toBe("AD1-020");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("aldamon").instanceId)).toBe(true);
  });

  it("at end of attack trashes a Hybrid, draws 2, and plays an inherited-effect Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "aldamon" }],
          hand: [
            { card: "BT12-009", as: "hybrid" },
            { card: "BT12-088", as: "takuya" },
          ],
          deck: [
            { card: "BT1-009", as: "draw1" },
            { card: "BT1-009", as: "draw2" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("aldamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw1").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw2").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
  });

  it("still plays the Tamer after an attack when no card was trashed, per Q6052", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "aldamon" }],
          trash: [{ card: "BT12-088", as: "takuya" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("aldamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"));

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
  });

  it("resolves the same trash, draw, and free-play sequence on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "aldamon", suspended: true }],
          hand: [{ card: "BT12-009", as: "hybrid" }],
          trash: [{ card: "BT12-088", as: "takuya" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const aldmonId = s.perm("aldamon").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: aldmonId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"),
      5000,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === aldmonId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
  });

  it("grants the inherited +4000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", dp: 7000, as: "holder", under: ["AD1-002"] }] } });
    await s.ready();
    expect(s.perm("holder").currentDP).toBe(11000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("holder").currentDP).toBe(7000);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-002", as: "aldamon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aldamon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-002");
    const compiled = registeredCompiledCards.get("AD1-002") ?? getCompiledCard("AD1-002");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-002");
    expect(definition?.nameEn).toBe("Aldamon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });
});

describe("AD1-002 Aldamon — KB Q&A rulings", () => {
  const TWO_HYBRIDS = ["BT12-009", "BT12-009"];

  const digivolve = (s: EngineSetup, baseAlias: string, cardAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst(cardAlias).instanceId,
    });

  const attackPlayer = (s: EngineSetup, attackerAlias: string) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attackerAlias).permanentId,
      target: { kind: "player" },
    });

  it("digivolves a Tamer under a Digimon-can't-digivolve effect without firing when-a-Digimon-digivolves watchers (Q6903)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          battleArea: [
            { card: "AD1-020", as: "takuya", under: TWO_HYBRIDS },
            { card: "BT1-009", as: "monodramon" },
            { card: "EX2-045", as: "calumon" },
          ],
          hand: [
            { card: "AD1-002", as: "aldamon" },
            { card: "BT1-015", as: "greymon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(digivolve(s, "monodramon", "greymon")).toMatchObject({ ok: false });
    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");

    expect(digivolve(s, "takuya", "aldamon")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "AD1-002");
    await drainMicrotasks();
    expect(s.perm("calumon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);

    const control = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "monodramon" },
            { card: "EX2-045", as: "calumon" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 3;
    expect(digivolve(control, "monodramon", "greymon")).toEqual({ ok: true });
    await settle(() => control.perm("calumon").isSuspended);
    expect(control.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when a Tamer digivolves into it (Q6904)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-020", as: "takuya", under: TWO_HYBRIDS }],
          hand: [{ card: "AD1-002", as: "aldamon" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(digivolve(s, "takuya", "aldamon")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId));

    expect(s.perm("takuya").topCard?.cardId).toBe("AD1-002");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("can attack with Rush after digivolving from a Tamer played this turn, unlike a non-Rush Digimon (Q6905)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-020", as: "takuya", under: TWO_HYBRIDS, enteredThisTurn: true },
            { card: "BT17-083", as: "koji", under: TWO_HYBRIDS, enteredThisTurn: true },
          ],
          hand: [
            { card: "AD1-002", as: "aldamon" },
            { card: "AD1-015", as: "beowolfmon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(digivolve(s, "koji", "beowolfmon")).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.cardId === "AD1-015");
    expect(digivolve(s, "takuya", "aldamon")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "AD1-002");
    await drainMicrotasks();

    expect(attackPlayer(s, "koji")).toMatchObject({ ok: false });
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(attackPlayer(s, "takuya")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves play (Q6906)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-020", as: "takuya", under: TWO_HYBRIDS, suspended: true }],
          hand: [{ card: "AD1-002", as: "aldamon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 15000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const tamerCard = s.perm("takuya").topCard!;
    const aldamonId = s.perm("takuya").permanentId;

    expect(digivolve(s, "takuya", "aldamon")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "AD1-002");
    await drainMicrotasks();
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toContain(tamerCard.instanceId);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "AD1-020")).toHaveLength(
      0,
    );

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: aldamonId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === aldamonId), 5000);
    await drainMicrotasks();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(tamerCard.instanceId);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not gain the [Security] effect of a Tamer among its digivolution cards (Q6907)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya", under: TWO_HYBRIDS }],
          hand: [{ card: "AD1-002", as: "aldamon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "attacker", dp: 15000 }],
          security: [{ card: "BT12-088", as: "securityTakuya" }, "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const sourceTamer = s.perm("takuya").topCard!;
    const aldamonId = s.perm("takuya").permanentId;

    expect(digivolve(s, "takuya", "aldamon")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "AD1-002");
    await drainMicrotasks();

    expect(attackPlayer(s, "takuya")).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityTakuya").instanceId,
      ),
    );
    await drainMicrotasks();

    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toContain(sourceTamer.instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["AD1-002"]);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    await drainMicrotasks();

    expect(s.perm("takuya").permanentId).toBe(aldamonId);
    expect(s.perm("takuya").stack.map((card) => card.instanceId)).toContain(sourceTamer.instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["AD1-002"]);
  });

  it("gains the inherited effect of a Tamer among its digivolution cards (Q6908)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-088", as: "takuya", under: TWO_HYBRIDS },
            { card: "AD1-002", as: "withoutTamer", under: TWO_HYBRIDS },
          ],
          hand: [{ card: "AD1-002", as: "aldamon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(digivolve(s, "takuya", "aldamon")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "AD1-002");
    await drainMicrotasks();
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("takuya").currentDP - s.perm("withoutTamer").currentDP).toBe(2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("takuya").currentDP).toBe(s.perm("withoutTamer").currentDP);
  });
});
