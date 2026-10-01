import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT5/BT5-091.js";
import "../BT12/BT12-088.js";
import "../BT13/BT13-007.js";
import { compiled } from "./BT18-012.js";
import "./BT18-014.js";

describe("BT18-012 Grumblemon", () => {
  it("deletes an opposing Digimon at 3000 DP or less on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } } },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT18-012", as: "grumblemon" }] },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "small" },
            { card: "BT1-030", dp: 4000, as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const smallId = s.perm("small").permanentId;
    const largeId = s.perm("large").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grumblemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === smallId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === largeId)).toBe(true);
  });

  it("digivolves from Gigasmon for 0 and resolves the When Digivolving deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-014", as: "gigasmon" }],
          hand: [{ card: "BT18-012", as: "grumblemon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const targetId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gigasmon").permanentId,
        instanceId: s.inst("grumblemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("gigasmon").stack.at(-1)?.cardId).toBe("BT18-014");
  });

  it("deletes once per turn through the inherited When Attacking effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-012"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "first" },
            { card: "BT1-030", dp: 3000, as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(secondId);
  });

  it("does not delete a second opposing Digimon on a same-turn reattack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-012"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "first" },
            { card: "BT1-030", dp: 3000, as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstId));

    await advance(s.engine).verb.unsuspend([hostId]);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondId)).toBe(true);
  });
});

describe("BT18-012 Grumblemon — KB Q&A rulings", () => {
  const TAKUYA = "BT12-088";
  const RED_ROOKIE = "BT1-013";
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  function digivolveGrumblemon(s: EngineSetup, base: string) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(base).permanentId,
      instanceId: s.inst("grumblemon").instanceId,
      useAlternateCost: base === "takuya",
    });
  }

  it("digivolves from the Tamer as-is: Digimon digivolve watchers stay silent and Digimon can't-digivolve locks do not apply (Q2916)", async () => {
    function boardWithTakumiAiba() {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: TAKUYA, as: "takuya" },
              { card: RED_ROOKIE, as: "rookie" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [{ card: "BT18-012", as: "grumblemon" }],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }

    const digimonControl = boardWithTakumiAiba();
    expect(digivolveGrumblemon(digimonControl, "rookie")).toEqual({ ok: true });
    await settle(() => digimonControl.perm("rookie").topCard.cardId === "BT18-012");
    await settle();
    expect(digimonControl.perm("takumi").isSuspended).toBe(true);
    expect(digimonControl.state.players[0]!.hand).toHaveLength(2);

    const fromTamer = boardWithTakumiAiba();
    expect(digivolveGrumblemon(fromTamer, "takuya")).toEqual({ ok: true });
    await settle(() => fromTamer.perm("takuya").topCard.cardId === "BT18-012");
    await settle();
    expect(fromTamer.state.memory).toBe(8);
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);
    expect(fromTamer.state.players[0]!.hand).toHaveLength(1);

    function lockedBoard() {
      const s = setupEngine(
        {
          0: {
            breeding: "BT13-007",
            battleArea: [
              { card: TAKUYA, as: "takuya" },
              { card: RED_ROOKIE, as: "rookie" },
            ],
            hand: [{ card: "BT18-012", as: "grumblemon" }],
            deck: [...FILLER],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }

    const lockedDigimon = lockedBoard();
    await lockedDigimon.ready();
    expect(digivolveGrumblemon(lockedDigimon, "rookie")).toMatchObject({ ok: false });
    expect(lockedDigimon.perm("rookie").topCard.cardId).toBe(RED_ROOKIE);

    const lockedTamer = lockedBoard();
    await lockedTamer.ready();
    expect(digivolveGrumblemon(lockedTamer, "takuya")).toEqual({ ok: true });
    await settle(() => lockedTamer.perm("takuya").topCard.cardId === "BT18-012");
    expect(lockedTamer.state.memory).toBe(8);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2917)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKUYA, as: "takuya" }],
          hand: [{ card: "BT18-012", as: "grumblemon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveGrumblemon(s, "takuya")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("takuya").topCard.cardId).toBe("BT18-012");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q2918)", async () => {
    function boardWithTakuya(takuyaZone: "hand" | "battleArea") {
      const takuya = { card: TAKUYA, as: "takuya" };
      const s = setupEngine(
        {
          0: {
            battleArea: takuyaZone === "battleArea" ? [takuya] : [],
            hand:
              takuyaZone === "hand"
                ? [{ card: "BT18-012", as: "grumblemon" }, takuya]
                : [{ card: "BT18-012", as: "grumblemon" }],
            deck: [...FILLER],
          },
          1: { security: 3, deck: [...FILLER] },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }
    async function digivolveOntoTakuya(s: EngineSetup) {
      expect(digivolveGrumblemon(s, "takuya")).toEqual({ ok: true });
      await settle(() => s.perm("takuya").topCard.cardId === "BT18-012");
      await settle();
    }
    function attackPlayer(s: EngineSetup) {
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      });
    }

    const fresh = boardWithTakuya("hand");
    expect(fresh.engine.applyIntent(0, { type: "playCard", instanceId: fresh.inst("takuya").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => fresh.state.players[0]!.battleArea.length === 1);
    expect(fresh.state.memory).toBe(6);
    await digivolveOntoTakuya(fresh);
    expect(attackPlayer(fresh)).toMatchObject({ ok: false });
    expect(fresh.perm("takuya").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(3);

    const established = boardWithTakuya("battleArea");
    await digivolveOntoTakuya(established);
    expect(attackPlayer(established)).toEqual({ ok: true });
    await settle(() => established.state.players[1]!.security.length === 2);
    expect(established.perm("takuya").isSuspended).toBe(true);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6577)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKUYA, as: "takuya" }],
          hand: [{ card: "BT18-012", as: "grumblemon" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const takuyaCard = s.perm("takuya").topCard.instanceId;
    expect(digivolveGrumblemon(s, "takuya")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT18-012");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toEqual([takuyaCard]);

    await advance(s.engine).verb.deletePermanent([s.perm("takuya").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([takuyaCard, s.inst("grumblemon").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6578)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: TAKUYA, as: "takuya" }],
          hand: [{ card: "BT18-012", as: "grumblemon" }],
          security: [{ card: TAKUYA, as: "securityTakuya" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveGrumblemon(s, "takuya")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT18-012");
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("takuya"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toEqual([TAKUYA]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTakuya"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("securityTakuya").topCard.cardId).toBe(TAKUYA);
  });

  it("gains the inherited effects of a Tamer in its digivolution cards (Q6579)", async () => {
    async function digivolvedOnto(base: "takuya" | "rookie") {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base === "takuya" ? TAKUYA : RED_ROOKIE, as: base }],
            hand: [{ card: "BT18-012", as: "grumblemon" }],
            deck: [...FILLER],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(digivolveGrumblemon(s, base)).toEqual({ ok: true });
      await settle(() => s.perm(base).topCard.cardId === "BT18-012");
      await s.ready();
      return s.perm(base).currentDP;
    }

    expect(await digivolvedOnto("takuya")).toBe(7000);
    expect(await digivolvedOnto("rookie")).toBe(5000);
  });
});
