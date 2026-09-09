import { describe, expect, it } from "vitest";
import { getCardDefinition, type DecisionRequest, type Seat } from "@aegis/shared";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT19-072.js";

// Inert main-deck Digimon only: no Digi-Egg may sit in a deck or in security, and the
// numeric `security: n` form is forbidden.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

/** Every `chooseTargets` candidate set the engine offered, in order. */
function recordCandidates(s: { decisions: { seat: Seat; req: DecisionRequest }[] }): () => string[][] {
  return () =>
    s.decisions
      .filter(({ req }) => req.kind === "chooseTargets")
      .map(({ req }) => req.options?.candidateInstanceIds ?? []);
}

describe("BT19-072 LordKnightmon", () => {
  it("matches the catalog print this audit reads from", () => {
    expect(getCardDefinition("BT19-072")).toMatchObject({
      cardId: "BT19-072",
      nameEn: "LordKnightmon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 3 },
        { color: "Purple", level: 5, memoryCost: 3 },
      ],
      effectText:
        "[On Play] [When Digivolving] You may play 1 level 4 or lower Digimon card from your trash without paying the cost.\n" +
        "[Opponent's Turn] [Once Per Turn] When an opponent's Digimon attacks, you may switch the attack target to 1 of your Digimon with the [Royal Knight]\u00a0trait.",
    });
    expect(getCardDefinition("BT19-072")?.inheritedEffectText).toBeUndefined();
  });

  it("compiles both play timings and the once-per-turn opponent-turn redirect", () => {
    const card = runtimeCompiledCard("BT19-072");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(card?.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
          },
        ],
      });
    }
    expect(card?.effects.find((effect) => effect.trigger === "OpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  // "with the [Royal Knight] trait" is an EXACT trait match, not a substring.
                  nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
                },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });

  it("[On Play] revives exactly one Lv4-or-lower Digimon and leaves the near misses in trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-072", as: "lord" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [
            { card: "BT4-080", as: "lv4" },
            { card: "BT3-085", as: "lv5" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.state.memory).toBe(-1); // the play cost 11; the revived Digimon was free
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId).sort()).toEqual(
      [s.inst("lord").instanceId, s.inst("lv4").instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("lv5").instanceId, s.inst("tamer").instanceId].sort(),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] declining the optional revive leaves the trash untouched", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-072", as: "lord" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT4-080", as: "lv4" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-072"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("lv4").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] fires off a real Purple Lv5 stack for 3 memory and draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-072", as: "lord" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [{ card: "BT3-085", as: "base", under: ["BT3-076", "BT3-083"] }],
          trash: [
            { card: "BT4-080", as: "lv4" },
            { card: "BT3-085", as: "lv5" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }, ...FILLER],
          security: [...SECURITY],
        },
        1: { deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lord").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.state.memory).toBe(7); // Purple Lv5 evolution cost 3
    expect(s.perm("base").topCard?.cardId).toBe("BT19-072");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT3-076", "BT3-083", "BT3-085"]);
    expect(s.perm("base").stack.at(-1)?.instanceId).toBe(baseInstanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("drawn").instanceId].sort(),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("lv4").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("lv5").instanceId]);
  });

  it("refuses an illegal digivolution source (Lv4 Purple, off-colour Lv5)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT19-072", as: "lord" }],
        battleArea: [
          { card: "BT4-080", as: "purpleLv4" },
          { card: "BT1-020", as: "redLv5" },
        ],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["purpleLv4", "redLv5"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("lord").instanceId,
        }),
      ).not.toEqual({ ok: true });
    }

    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("lord").instanceId]);
  });

  it("switches the attack onto a [Royal Knight] once per opponent turn, never onto a plain Knightmon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-072", as: "lord" },
            { card: "BT13-090", as: "royal" },
            // Near-miss peer: [Knightmon] in its name, trait "Warrior", not [Royal Knight].
            { card: "ST13-12", as: "plainKnight" },
            { card: "BT1-009", as: "wall", dp: 5000 },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT12-069", as: "attackerOne" },
            { card: "BT10-064", as: "attackerTwo" },
          ],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("royal").permanentId, s.perm("royal").topCard!.instanceId);
    const candidates = recordCandidates(s);
    const wallInstanceId = s.perm("wall").topCard!.instanceId;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Suspend my wall through a real attack so it is a legal defender on the opponent's turn.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wall").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wall").isSuspended);
    await settle();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("wall").isSuspended).toBe(true);

    // First attack of the opponent's turn: the switch sends it into the Royal Knight.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    // 9000 attacker into the 11000 Royal Knight: the attacker dies, my wall is untouched.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT10-064"]);
    // The security card my wall broke earlier is also in that trash; the attacker joined it.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT12-069");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT1-009", "BT13-090", "BT19-072", "ST13-12"].sort(),
    );
    // The trait gate is exact: the plain [Knightmon] was never a candidate.
    const offered = candidates().flat();
    expect(offered).toContain(s.perm("royal").permanentId);
    expect(offered).not.toContain(s.perm("plainKnight").permanentId);
    expect(offered).not.toContain(s.perm("plainKnight").topCard!.instanceId);

    // Second attack of the SAME opponent turn: the once-per-turn switch is spent.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT13-090", "BT19-072", "ST13-12"].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([wallInstanceId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT10-064"]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q3133: switches onto a Royal Knight that isn't affected by effects", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-072", as: "lord" },
            { card: "BT13-090", as: "royal" },
            { card: "BT1-009", as: "wall", dp: 5000 },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT12-069", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("royal").permanentId, s.perm("royal").topCard!.instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // "Isn't affected by effects" on my own Royal Knight: CR 15-15-5-3 keeps it choosable, and
    // the ruling confirms the switch still happens.
    await advance(s.engine).verb.restrict(s.perm("royal").permanentId, "beAffected", EffectDuration.Permanent);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wall").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wall").isSuspended);
    await settle();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // The security card my wall broke earlier is also in that trash; the attacker joined it.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT12-069");
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      ["BT1-009", "BT13-090", "BT19-072"].sort(),
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
