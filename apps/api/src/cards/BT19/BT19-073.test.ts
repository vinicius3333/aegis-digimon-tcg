import { describe, expect, it } from "vitest";
import { getCardDefinition, type DecisionRequest, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT19-073.js";

// Inert main-deck Digimon only: no Digi-Egg may sit in a deck or in security, and the
// numeric `security: n` form is forbidden.
const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

/**
 * Answer the successive `chooseTargets` decisions of one effect with named permanents, in
 * order. The printed clause picks a ＜De-Digivolve＞ target and then a SEPARATE digivolve-lock
 * target, so a blanket auto-responder cannot express "de-digivolve this one, lock that one".
 */
function scriptTargets(s: EngineSetup, picks: string[][]) {
  const answered = new Set<string>();
  const seen: { candidates: string[]; picked: string[] }[] = [];
  let next = 0;
  return {
    seen,
    drive(): void {
      for (const { seat, req } of s.decisions as { seat: Seat; req: DecisionRequest }[]) {
        if (req.kind !== "chooseTargets" || answered.has(req.decisionId)) continue;
        answered.add(req.decisionId);
        const candidates = req.options?.candidateInstanceIds ?? [];
        const wanted = picks[next] ?? [];
        next += 1;
        const instanceIds = candidates.filter((id) => wanted.includes(id));
        seen.push({ candidates, picked: instanceIds });
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "chooseTargets", instanceIds },
        });
      }
    },
  };
}

/** Every id a scripted pick may legitimately name for one permanent. */
function idsOf(s: EngineSetup, alias: string): string[] {
  const permanent = s.perm(alias);
  return [permanent.permanentId, permanent.topCard!.instanceId];
}

describe("BT19-073 LordKnightmon (X Antibody)", () => {
  it("matches the catalog print this audit reads from", () => {
    expect(getCardDefinition("BT19-073")).toMatchObject({
      cardId: "BT19-073",
      nameEn: "LordKnightmon (X Antibody)",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Holy Warrior", "X Antibody", "Royal Knight"],
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
      effectText:
        "[Digivolve][LordKnightmon]: Cost 1 \n\n＜Collision＞.\n＜Piercing＞ \n" +
        "[When Digivolving] For each of your Digimon, ＜De-Digivolve1＞ 1 of your opponent's Digimon. " +
        "Then, until the end of their turn, 1 of their Digimon can't digivolve.\n" +
        "[All Turns] While[LordKnightmon]/[X Antibody] is in this Digimon's digivolution cards, " +
        "all of your Digimon with [Knightmon] in its text gain ＜Alliance＞and get +3000 DP.",
    });
    expect(getCardDefinition("BT19-073")?.inheritedEffectText).toBeUndefined();
  });

  it("compiles the exact-name alternate route, both keywords, and the conditional grant", () => {
    const card = runtimeCompiledCard("BT19-073");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    // "[Digivolve][LordKnightmon]" is a bracketed EXACT name: a substring `names` gate would
    // let this card's own print ("LordKnightmon (X Antibody)") serve as its source.
    expect(card?.digivolutionRequirement).toEqual([{ namesExact: ["LordKnightmon"], cost: 1, isAlternate: true }]);
    expect(card?.effects.filter((effect) => effect.keywords !== undefined)).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Collision" }] },
      { trigger: "Static", keywords: [{ keyword: "Piercing" }] },
    ]);
    expect(card?.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          // Q3134: ONE opponent Digimon is chosen for the whole clause ...
          kind: "SelectBind",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "deDigivolveTarget" },
        },
        {
          // ... and ＜De-Digivolve 1＞ is repeated on THAT Digimon, once per your Digimon.
          kind: "DeDigivolve",
          target: { fromSelectionRef: "deDigivolveTarget", count: 1 },
          amount: 1,
          scaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "cards" },
        },
        {
          // "Then, ... 1 of their Digimon can't digivolve" is a SEPARATE selection.
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(card?.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      condition: {
        kind: "selfHasInDigivolutionCards",
        nameOrTrait: [
          { tokens: ["LordKnightmon"], match: "nameExact" },
          { tokens: ["X Antibody"], match: "trait" },
        ],
      },
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Alliance" },
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] } },
        },
        {
          kind: "ModifyDP",
          amount: 3000,
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] } },
        },
      ],
    });
  });

  it("takes the printed [LordKnightmon] route for 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-073", as: "xAntibody" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [{ card: "BT13-090", as: "base", under: ["BT3-076", "BT3-085"] }],
          deck: [{ card: "BT1-013", as: "drawn" }, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT3-085", as: "victim", under: ["BT3-076"] }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-073");
    await settle();

    expect(s.state.memory).toBe(9); // the alternate route costs 1, not the printed 4
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT3-076", "BT3-085", "BT13-090"]);
    expect(s.perm("base").stack.at(-1)?.instanceId).toBe(baseInstanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("spare").instanceId, s.inst("drawn").instanceId].sort(),
    );
  });

  it("charges the normal Lv5 cost of 4 when the base is not exactly [LordKnightmon]", async () => {
    // `useAlternateCost` silently falls back to the normal route when no alternate matches,
    // so only the memory delta discriminates.
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-073", as: "xAntibody" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [{ card: "BT10-066", as: "darkKnightmon", under: ["BT7-058"] }],
          deck: [{ card: "BT1-013", as: "drawn" }, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT3-085", as: "victim", under: ["BT3-076"] }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("darkKnightmon").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("darkKnightmon").topCard?.cardId === "BT19-073");
    await settle();

    expect(s.state.memory).toBe(6); // Black Lv5 evolution cost 4
  });

  it("refuses its own print as a source: [LordKnightmon] is exact, not a substring", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT19-073", as: "xAntibody" }],
        battleArea: [
          // "LordKnightmon (X Antibody)" CONTAINS "LordKnightmon" but is not that card.
          { card: "BT19-073", as: "selfPeer", under: ["BT13-090"] },
          { card: "BT4-080", as: "purpleLv4" },
        ],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["selfPeer", "purpleLv4"]) {
      for (const useAlternateCost of [true, false]) {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: s.perm(alias).permanentId,
            instanceId: s.inst("xAntibody").instanceId,
            useAlternateCost,
          }),
        ).not.toEqual({ ok: true });
      }
    }

    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("xAntibody").instanceId]);
    expect(s.perm("selfPeer").topCard?.cardId).toBe("BT19-073");
  });

  it("Q3134: de-digivolves ONE opponent Digimon once per your Digimon, then locks a DIFFERENT one", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-073", as: "xAntibody" },
          { card: "BT1-009", as: "spare" },
        ],
        battleArea: [
          { card: "BT13-090", as: "base", under: ["BT3-085"] },
          // The second of "your Digimon": the scaling counts 2 after the digivolution.
          { card: "BT12-079", as: "peer" },
        ],
        deck: [{ card: "BT1-013", as: "drawn" }, ...FILLER],
        security: [...SECURITY],
      },
      1: {
        battleArea: [
          { card: "BT3-085", as: "deDigivolved", under: ["BT3-076", "BT3-083"] },
          { card: "BT12-069", as: "locked", under: ["BT2-052"] },
        ],
        deck: [...FILLER],
        security: [...SECURITY],
        hand: [{ card: "BT1-009", as: "opponentSpare" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const script = scriptTargets(s, [idsOf(s, "deDigivolved"), idsOf(s, "locked")]);
    const stackBefore = s.perm("deDigivolved").stack.map((card) => card.instanceId);
    const lockedStackBefore = s.perm("locked").stack.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      script.drive();
      return observe(s.engine).isRestricted(s.perm("locked"), "digivolve");
    });
    await settle();
    script.drive();

    // Only the chosen Digimon was de-digivolved, twice (one per my two Digimon).
    expect(s.perm("deDigivolved").topCard?.cardId).toBe("BT3-076");
    expect(s.perm("deDigivolved").stack).toHaveLength(0);
    expect(s.perm("deDigivolved").topCard?.instanceId).toBe(stackBefore[0]);
    expect(s.perm("locked").topCard?.cardId).toBe("BT12-069");
    expect(s.perm("locked").stack.map((card) => card.instanceId)).toEqual(lockedStackBefore);
    // The two selections are independent: the lock landed on the OTHER Digimon.
    expect(observe(s.engine).isRestricted(s.perm("locked"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("deDigivolved"), "digivolve")).toBe(false);
    expect(script.seen[0]!.candidates).toEqual(
      expect.arrayContaining([s.perm("deDigivolved").permanentId, s.perm("locked").permanentId]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the digivolve lock through the opponent's own turn", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT19-073", as: "xAntibody" },
          { card: "BT1-009", as: "spare" },
        ],
        battleArea: [{ card: "BT13-090", as: "base", under: ["BT3-085"] }],
        deck: [{ card: "BT1-013", as: "drawn" }, ...FILLER, ...FILLER],
        security: [...SECURITY],
      },
      1: {
        battleArea: [
          { card: "BT3-085", as: "locked", under: ["BT3-076"] },
          { card: "BT12-079", as: "free", under: ["BT3-076"] },
          { card: "BT10-079", as: "victim", under: ["BT3-076"] },
        ],
        hand: [
          { card: "BT19-071", as: "beelzemonOne" },
          { card: "BT19-071", as: "beelzemonTwo" },
        ],
        deck: [...FILLER, ...FILLER],
        security: [...SECURITY],
      },
    });
    await s.ready();
    // De-digivolve one Digimon, lock a different one.
    const script = scriptTargets(s, [idsOf(s, "victim"), idsOf(s, "locked")]);
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("xAntibody").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      script.drive();
      return observe(s.engine).isRestricted(s.perm("locked"), "digivolve");
    });
    await settle();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });

    // The opponent's real turn: their locked Digimon cannot digivolve, the peer can.
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    s.state.memory = 10; // the gauge is turn-relative: 10 in the opponent's own favour
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("beelzemonOne").instanceId,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("free").permanentId,
        instanceId: s.inst("beelzemonTwo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("free").topCard?.cardId === "BT19-071");
    await settle();

    expect(s.perm("locked").topCard?.cardId).toBe("BT3-085");
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("beelzemonOne").instanceId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[All Turns] buffs only your own [Knightmon]-in-text Digimon while the gate holds", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-073", as: "host", under: ["BT13-090"] },
          { card: "ST13-12", as: "knightmon" },
          // Near-miss peer: same colour, no [Knightmon] anywhere in its text.
          { card: "BT12-069", as: "plainPeer" },
        ],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: {
        battleArea: [{ card: "ST13-12", as: "theirKnightmon" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
    });
    await s.ready();

    expect(s.perm("knightmon").currentDP).toBe(10_000); // 7000 + 3000
    expect(observe(s.engine).hasKeyword(s.perm("knightmon"), "Alliance")).toBe(true);
    expect(s.perm("host").currentDP).toBe(15_000); // its own name carries [Knightmon] too
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
    expect(s.perm("plainPeer").currentDP).toBe(9000);
    expect(observe(s.engine).hasKeyword(s.perm("plainPeer"), "Alliance")).toBe(false);
    // "your Digimon" only: the opponent's identical Knightmon is untouched.
    expect(s.perm("theirKnightmon").currentDP).toBe(7000);
    expect(observe(s.engine).hasKeyword(s.perm("theirKnightmon"), "Alliance")).toBe(false);
  });

  it("[All Turns] grants nothing without [LordKnightmon]/[X Antibody] in the digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-073", as: "host", under: ["BT12-069"] },
          { card: "ST13-12", as: "knightmon" },
        ],
        hand: [{ card: "BT1-009", as: "spare" }],
        deck: [...FILLER],
        security: [...SECURITY],
      },
      1: { deck: [...FILLER], security: [...SECURITY] },
    });
    await s.ready();

    expect(s.perm("knightmon").currentDP).toBe(7000);
    expect(observe(s.engine).hasKeyword(s.perm("knightmon"), "Alliance")).toBe(false);
    expect(s.perm("host").currentDP).toBe(12_000);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(false);
  });

  it("＜Collision＞ forces the block and ＜Piercing＞ sends the excess into security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-073", as: "host", under: ["BT13-090"] }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT12-069", as: "blocker" }],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const securityBefore = s.state.players[1]!.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // ＜Collision＞ (§16-30): the opponent's plain Digimon gains ＜Blocker＞ and must block.
    await settle();
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // ＜Piercing＞: 15000 over the 9000 blocker, and the excess checks security.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT12-069");
    expect(s.state.players[1]!.security.length).toBeLessThan(securityBefore);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
