import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT5/BT5-091.js";
import "../BT12/BT12-088.js";
import "../BT13/BT13-007.js";
import { compiled } from "./BT18-014.js";

describe("BT18-014 Gigasmon", () => {
  it("grants Rush to one of your Digimon on play", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "forTheTurn",
          target: { filter: { controller: "mine", kind: ["Digimon"] } },
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
      { 0: { hand: [{ card: "BT18-014", as: "gigasmon" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gigasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Rush"));
    expect(observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Rush")).toBe(true);
  });

  it("digivolves from Grumblemon for 1 and grants Rush at When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-012", as: "grumblemon" },
            { card: "BT1-030", as: "ally" },
          ],
          hand: [{ card: "BT18-014", as: "gigasmon" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("grumblemon").permanentId,
        instanceId: s.inst("gigasmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("grumblemon").topCard.cardId === "BT18-014");
    expect(s.state.memory).toBe(4);
    expect(s.perm("grumblemon").stack.at(-1)?.cardId).toBe("BT18-012");
    expect(
      [s.perm("grumblemon"), s.perm("ally")].filter((permanent) => observe(s.engine).hasKeyword(permanent, "Rush")),
    ).toHaveLength(1);
  });

  it("deletes at the exact 3000 DP boundary once per turn as an inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-014"] }] },
        1: {
          battleArea: [
            { card: "BT1-030", dp: 3000, as: "first" },
            { card: "BT1-030", dp: 3000, as: "second" },
            { card: "BT1-030", dp: 4000, as: "large" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const largeId = s.perm("large").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(secondId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(largeId);
  });

  it("does not delete a second opposing Digimon on a same-turn reattack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-014"] }] },
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

describe("BT18-014 Gigasmon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

  function digivolveFromTakuya(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("takuya").permanentId,
      instanceId: s.inst("gigasmon").instanceId,
      useAlternateCost: true,
    });
  }

  function digivolveRookie(s: EngineSetup) {
    return s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("rookie").permanentId,
      instanceId: s.inst("champion").instanceId,
    });
  }

  it("digivolves from the Tamer as-is: Digimon digivolve watchers stay silent and Digimon can't-digivolve locks do not apply (Q2919)", async () => {
    function boardWithTakumiAiba() {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-088", as: "takuya" },
              { card: "BT1-010", as: "rookie" },
              { card: "BT5-091", as: "takumi" },
            ],
            hand: [
              { card: "BT18-014", as: "gigasmon" },
              { card: "BT1-018", as: "champion" },
            ],
            deck: [...FILLER],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }

    const digimonControl = boardWithTakumiAiba();
    expect(digivolveRookie(digimonControl)).toEqual({ ok: true });
    await settle(() => digimonControl.perm("rookie").topCard.cardId === "BT1-018");
    await settle();
    expect(digimonControl.perm("takumi").isSuspended).toBe(true);
    expect(digimonControl.state.players[0]!.hand).toHaveLength(3);

    const fromTamer = boardWithTakumiAiba();
    expect(digivolveFromTakuya(fromTamer)).toEqual({ ok: true });
    await settle(() => fromTamer.perm("takuya").topCard.cardId === "BT18-014");
    await settle();
    expect(fromTamer.state.memory).toBe(7);
    expect(fromTamer.perm("takumi").isSuspended).toBe(false);
    expect(fromTamer.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT1-009", "BT1-018"]);

    const locked = setupEngine(
      {
        0: {
          breeding: "BT13-007",
          battleArea: [
            { card: "BT12-088", as: "takuya" },
            { card: "BT1-010", as: "rookie" },
          ],
          hand: [
            { card: "BT18-014", as: "gigasmon" },
            { card: "BT1-018", as: "champion" },
          ],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    locked.state.memory = 10;
    await locked.ready();
    expect(digivolveRookie(locked)).toMatchObject({ ok: false });
    expect(locked.perm("rookie").topCard.cardId).toBe("BT1-010");
    expect(digivolveFromTakuya(locked)).toEqual({ ok: true });
    await settle(() => locked.perm("takuya").topCard.cardId === "BT18-014");
    expect(locked.state.memory).toBe(7);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q2920)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          hand: [{ card: "BT18-014", as: "gigasmon" }],
          deck: [{ card: "BT1-009", as: "drawn" }, ...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTakuya(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.perm("takuya").topCard.cardId).toBe("BT18-014");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(FILLER.length);
  });

  it("cannot attack the turn it digivolves from a Tamer played that turn (Q2921)", async () => {
    async function digivolvedFromTakuya(enteredThisTurn: boolean) {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-088", as: "takuya", enteredThisTurn },
              { card: "BT1-010", as: "rushTarget" },
            ],
            hand: [{ card: "BT18-014", as: "gigasmon" }],
            deck: [...FILLER],
          },
          1: { security: 3, deck: [...FILLER] },
        },
        { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      // Gigasmon's own [When Digivolving] <Rush> goes to the other Digimon so it cannot lift the restriction.
      preferInstanceIds.push(s.perm("rushTarget").topCard.instanceId);
      s.state.memory = 10;
      expect(digivolveFromTakuya(s)).toEqual({ ok: true });
      await settle(() => s.perm("takuya").topCard.cardId === "BT18-014");
      await settle();
      expect(observe(s.engine).hasKeyword(s.perm("takuya"), "Rush")).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("rushTarget"), "Rush")).toBe(true);
      return s;
    }
    function attackPlayer(s: EngineSetup) {
      return s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      });
    }

    const fresh = await digivolvedFromTakuya(true);
    expect(attackPlayer(fresh)).toMatchObject({ ok: false });
    expect(fresh.perm("takuya").isSuspended).toBe(false);
    expect(fresh.state.players[1]!.security).toHaveLength(3);

    const established = await digivolvedFromTakuya(false);
    expect(attackPlayer(established)).toEqual({ ok: true });
    await settle(() => established.state.players[1]!.security.length === 2);
    expect(established.perm("takuya").isSuspended).toBe(true);
  });

  it("keeps the Tamer as a digivolution card that is trashed when the Digimon leaves the field (Q6580)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          hand: [{ card: "BT18-014", as: "gigasmon" }],
          deck: [...FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const takuyaCard = s.perm("takuya").topCard.instanceId;
    expect(digivolveFromTakuya(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT18-014");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toEqual([takuyaCard]);

    await advance(s.engine).verb.deletePermanent([s.perm("takuya").permanentId]);
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([takuyaCard, s.inst("gigasmon").instanceId]),
    );
  });

  it("does not gain the [Security] effect of a Tamer in its digivolution cards (Q6581)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-088", as: "takuya" }],
          hand: [{ card: "BT18-014", as: "gigasmon" }],
          security: [{ card: "BT12-088", as: "securityTakuya" }],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(digivolveFromTakuya(s)).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT18-014");
    await s.ready();

    await advance(s.engine).fire(EffectTiming.SecuritySkill, s.perm("takuya"));
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("takuya").stack.map(({ cardId }) => cardId)).toEqual(["BT12-088"]);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTakuya"));
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.perm("securityTakuya").topCard.cardId).toBe("BT12-088");
  });

  it("gains the inherited effects of a Tamer in its digivolution cards (Q6582)", async () => {
    function digivolvedOnto(base: "BT12-088" | "BT1-010") {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "takuya" }],
            hand: [{ card: "BT18-014", as: "gigasmon" }],
            deck: [...FILLER],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      return s;
    }

    const fromTamer = digivolvedOnto("BT12-088");
    expect(digivolveFromTakuya(fromTamer)).toEqual({ ok: true });
    await settle(() => fromTamer.perm("takuya").topCard.cardId === "BT18-014");
    await fromTamer.ready();
    expect(fromTamer.perm("takuya").currentDP).toBe(8000);

    const fromDigimon = digivolvedOnto("BT1-010");
    expect(
      fromDigimon.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: fromDigimon.perm("takuya").permanentId,
        instanceId: fromDigimon.inst("gigasmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => fromDigimon.perm("takuya").topCard.cardId === "BT18-014");
    await fromDigimon.ready();
    expect(fromDigimon.perm("takuya").currentDP).toBe(6000);
  });
});
