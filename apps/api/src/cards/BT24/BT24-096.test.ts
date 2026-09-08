import { EffectTiming, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-096.js";
import "../index.js";

describe("BT24-096 Seventh Graviton", () => {
  it("limits the trash trigger to a Digimon digivolving into exact Creepymon (X Antibody)", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Creepymon (X Antibody)"], match: "nameExact" }],
          },
        },
      ],
    });
  });

  it("pays use cost 7, deletes exactly level 6+, and does not mill after a successful deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-096", as: "option" }], battleArea: [{ card: "BT3-089", as: "purple" }] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "level6" },
            { card: "BT1-020", as: "level5" },
          ],
          deck: [{ card: "BT1-009", as: "top" }, "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-080"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(true);
    expect(s.state.players[1]!.deck).toHaveLength(4);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(0);
  });

  it("deletes level 7 and refuses level 5 through the public Main intent", async () => {
    const positive = setupEngine({
      0: { hand: [{ card: "BT24-096", as: "option" }], battleArea: [{ card: "BT3-089", as: "purple" }] },
      1: { battleArea: [{ card: "BT19-074", as: "level7" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    positive.state.memory = 7;
    await positive.ready();
    expect(
      positive.engine.applyIntent(0, { type: "playCard", instanceId: positive.inst("option").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      positive.state.players[1]!.trash.some((card) => card.instanceId === positive.inst("level7").instanceId),
    );
    expect(positive.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      positive.inst("level7").instanceId,
    );

    const negative = setupEngine({
      0: { hand: [{ card: "BT24-096", as: "option" }], battleArea: [{ card: "BT3-089", as: "purple" }] },
      1: { battleArea: [{ card: "BT1-020", as: "level5" }], deck: ["BT1-009", "BT1-045", "AD1-001", "BT1-080"] },
    });
    negative.state.memory = 7;
    await negative.ready();
    expect(
      negative.engine.applyIntent(0, { type: "playCard", instanceId: negative.inst("option").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => negative.state.players[1]!.trash.length === 3);
    expect(
      negative.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === negative.inst("level5").instanceId),
    ).toBe(true);
  });

  it("mills the opponent's top 3 only when deletion fails, preserving deck order boundary", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-096", as: "option" }], battleArea: [{ card: "BT3-089", as: "purple" }] },
        1: {
          battleArea: [{ card: "BT1-020", as: "level5" }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-045", as: "second" },
            { card: "AD1-001", as: "third" },
            { card: "BT1-080", as: "fourth" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-020")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("fourth").instanceId]);
  });

  it("activates the same failed-delete Main branch from Security without paying cost", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT24-096", as: "securityOption", faceUp: true }] },
        1: { deck: ["BT1-009", "BT1-045", "AD1-001", "BT1-080"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("publicly reveals Security and activates Main without paying the 7-cost (Q5693)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-096", as: "securityOption" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "attacker", dp: 3000 }],
          security: ["BT1-013"],
          hand: ["BT1-010"],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-045", as: "second" },
            { card: "AD1-001", as: "third" },
            { card: "BT1-080", as: "fourth" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 2;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("fourth").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("from trash follows a real Creepymon X digivolution, pays its return cost, and activates Main", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT24-096", as: "graviton" }],
          battleArea: [{ card: "BT8-111", as: "creepymon" }],
          hand: [{ card: "BT24-078", as: "creepymonX" }],
          deck: [{ card: "BT1-009", as: "existingBottom" }],
        },
        1: { deck: ["BT1-009", "BT1-045", "AD1-001", "BT1-080"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("creepymon").permanentId,
        instanceId: s.inst("creepymonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("graviton").instanceId));
    await settle(() => s.state.players[1]!.trash.length === 3);

    expect(s.state.memory).toBe(8); // BT24-078's alternate [Creepymon] evolution cost is 2.
    expect(s.perm("creepymon").topCard?.cardId).toBe("BT24-078");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT24-096")).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT24-096");
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("repeats the trash trigger after the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT24-096", as: "firstGraviton" }],
          battleArea: [
            { card: "BT8-111", as: "firstBase" },
            { card: "BT8-111", as: "secondBase" },
          ],
          hand: [
            { card: "BT24-078", as: "firstX" },
            { card: "BT24-078", as: "secondX" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT19-074", as: "firstTarget" },
            { card: "BT19-074", as: "secondTarget" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("firstGraviton").instanceId));
    const secondGraviton = s.give(0, Zone.Trash, { card: "BT24-096", as: "secondGraviton" });
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(secondGraviton.instanceId);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("secondGraviton").instanceId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("secondGraviton").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("may decline the trash activation: no return cost and no Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "BT24-096", as: "graviton" }],
          battleArea: [{ card: "BT8-111", as: "creepymon" }],
          hand: [{ card: "BT24-078", as: "creepymonX" }],
          deck: ["BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-045", "AD1-001", "BT1-080"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("creepymon").permanentId,
        instanceId: s.inst("creepymonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("creepymon").topCard?.cardId === "BT24-078");
    await settle(() => false, 120);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("graviton").instanceId)).toBe(true);
    expect(s.state.players[1]!.deck).toHaveLength(4);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
