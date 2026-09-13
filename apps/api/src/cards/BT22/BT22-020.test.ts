import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-020.js";

describe("BT22-020 KausGammamon", () => {
  it("uses the printed level-3 Gammamon evolution requirement for exactly 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-008", as: "gammamon" }],
        hand: [{ card: "BT22-020", as: "kaus" }],
      },
    });
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gammamon").permanentId,
        instanceId: s.inst("kaus").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gammamon").topCard?.cardId === "BT22-020");
    expect(s.state.memory).toBe(0);
    expect(s.perm("gammamon").stack.map((card) => card.cardId)).toEqual(["BT8-008"]);
  });

  it("rejects a level-3 non-Gammamon source for the alternate evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-029", as: "nonGammamon" }],
        hand: [{ card: "BT22-020", as: "kaus" }],
      },
    });
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonGammamon").permanentId,
        instanceId: s.inst("kaus").instanceId,
      }).ok,
    ).toBe(false);
  });

  it("draws only after optionally placing a Gammamon-named Digimon from hand", () => {
    const whenAttacking = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(whenAttacking).toMatchObject({ frequency: "OncePerTurn" });
    expect(whenAttacking?.actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
          },
          count: 1,
          from: ["hand"],
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });

  it("places a chosen Gammamon, draws once, and does not fire the placed card per Q4874", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-020", as: "kaus" }],
          hand: [
            { card: "BT21-019", as: "placed" },
            { card: "BT8-086", as: "hiro" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kaus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kaus").stack.some((card) => card.instanceId === s.inst("placed").instanceId));
    expect(s.perm("kaus").stack.at(-1)?.instanceId).toBe(s.inst("placed").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hiro").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-086")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kaus").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hiro").instanceId, s.inst("drawn").instanceId]),
    );
  });

  it("may refuse the placement and leaves matching and nonmatching hand cards unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-020", as: "kaus" }],
          hand: [
            { card: "BT21-019", as: "matching" },
            { card: "BT22-022", as: "nonmatching" },
          ],
          deck: ["BT1-009"],
        },
        1: { security: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kaus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("kaus").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("matching").instanceId, s.inst("nonmatching").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("enforces the placement cost and once-per-turn limit across a reattack, then resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-020", as: "kaus", dp: 8000 }],
          hand: [
            { card: "BT21-019", as: "firstGammamon" },
            { card: "BT8-008", as: "secondGammamon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-012", "BT1-013", "BT1-014"], deck: ["BT1-015"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const deckAfterTurnStart = s.state.players[0]!.deck.length;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kaus").permanentId,
        target: { kind: "player" },
      });

    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("kaus").stack.some((card) => card.instanceId === s.inst("firstGammamon").instanceId));
    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("kaus").permanentId]);
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("kaus").stack.filter((card) => card.cardId === "BT21-019" || card.cardId === "BT8-008")).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT8-008");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterTurnStart - 1);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("kaus").stack.some((card) => card.instanceId === s.inst("secondGammamon").instanceId));
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterTurnStart - 3);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-011");
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants inherited Jamming from a realistic evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-033", under: ["BT22-020"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
