import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-057.js";
import "../index.js";

describe("BT21-057 Greymon", () => {
  it("preserves both alternate Digivolution requirements and complete coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Agumon"], cost: 2, isAlternate: true },
      { traits: ["ADVENTURE"], cost: 2, isAlternate: true, level: 3 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("grants the opponent's Digimon the printed conditional start-of-main attack", () => {
    const triggers = compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));

    expect(triggers).toHaveLength(2);
    for (const effect of triggers) {
      expect(effect.actions[0]).toMatchObject({
        kind: "GrantStatic",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        grant: "tokenEffect",
        tokens: ["GRANTEFFECT23TOKEN"],
        duration: "untilOpponentTurnEnd",
        condition: {
          kind: "youHave",
          filter: {
            controllerDefault: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              { tokens: ["Tai Kamiya"], match: "nameExact" },
              { tokens: ["ADVENTURE"], match: "trait" },
            ],
          },
        },
      });
    }
    expect(compiled.effects).toContainEqual({
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    });
  });

  it("with Tai, grants a selected opponent Digimon a forced start-of-main attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tai" }],
          hand: [{ card: "BT21-057", as: "greymon" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 6000 },
            { card: "BT1-019", as: "unselected" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("target")).length === 1);
    expect(observe(s.engine).customEffectGrants(s.perm("unselected"))).toHaveLength(0);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("unselected").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("keeps the grant on an attack-capable unaffected opponent Digimon but does not trigger it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tai" }],
          hand: [{ card: "BT21-057", as: "greymon" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        // ZeedMillenniummon has no inherent cannot-attack restriction and is unaffected by
        // opponent effects while it has no digivolution cards (CR 15-15-5). Its Reboot-like
        // suspension restriction is separate from attack capability; the unprotected BT1-010
        // target in the preceding public test demonstrates the same grant's normal attack.
        1: {
          battleArea: [{ card: "BT19-101", as: "unaffected" }],
          security: [{ card: "BT1-009", as: "opponent-security" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("unaffected").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("unaffected")).length === 1);
    expect(observe(s.engine).customEffectGrants(s.perm("unaffected"))).toHaveLength(1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("unaffected").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("does not grant the attack effect without Tai Kamiya or an ADVENTURE Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-057", as: "greymon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("greymon").topCard.cardId === "BT21-057");

    expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(0);
  });

  it.each(["BT21-040", "BT2-055"])("alternate-digivolves from %s with Agumon in its name for 2", async (base) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: base, as: "agumon" }],
        hand: [{ card: "BT21-057", as: "greymon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("agumon").permanentId,
        instanceId: s.inst("greymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("agumon").topCard.instanceId === s.inst("greymon").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("alternate-digivolves from a non-Agumon ADVENTURE rookie for the same printed cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST20-10", as: "adventureRookie" }],
        hand: [{ card: "BT21-057", as: "greymon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("adventureRookie").permanentId,
        instanceId: s.inst("greymon").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("adventureRookie").topCard.cardId === "BT21-057");
    expect(s.state.memory).toBe(1);
  });

  it("inherits Reboot through public evolution and unsuspends only that host on the opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-040", as: "source" },
            { card: "BT1-019", as: "control" },
          ],
          hand: [
            { card: "BT21-057", as: "greymon" },
            { card: "BT21-061", as: "metal" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("greymon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT21-057");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("metal").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT21-061");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT21-040", "BT21-057"]);
    expect(s.state.memory).toBe(5);
    for (const [index, alias] of ["source", "control"].entries()) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 2 - index && !observe(s.engine).isAttacking());
      expect(s.perm(alias).isSuspended).toBe(true);
    }
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("control").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it.each([
    ["own non-Tai ADVENTURE Tamer", "ST20-12", 0, true],
    ["opponent ADVENTURE Tamer", "ST20-12", 1, false],
    ["own unrelated Hero Tamer", "BT21-083", 0, false],
  ] as const)(
    "When Digivolving checks %s before granting the forced attack",
    async (_label, tamer, tamerSeat, grants) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-040", as: "base" }, ...(tamerSeat === 0 ? [{ card: tamer, as: "tamer" }] : [])],
            hand: [{ card: "BT21-057", as: "greymon" }],
            security: ["BT1-001"],
            deck: ["BT1-009", "BT1-010", "BT1-011"],
          },
          1: {
            battleArea: [{ card: "BT1-019", as: "target" }, ...(tamerSeat === 1 ? [{ card: tamer, as: "tamer" }] : [])],
            deck: ["BT1-009", "BT1-010", "BT1-011"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("greymon").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT21-057");
      expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(grants ? 1 : 0);
      await advance(s.engine).runTurn(0);
      s.state.turnSeat = 1;
      s.state.memory = 0;
      const opponentTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.security).toHaveLength(grants ? 0 : 1);
      expect(s.perm("target").isSuspended).toBe(grants);
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
      expect(observe(s.engine).customEffectGrants(s.perm("target"))).toHaveLength(0);
    },
  );
});
