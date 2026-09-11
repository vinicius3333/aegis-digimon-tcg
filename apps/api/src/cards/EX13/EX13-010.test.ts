import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-010.js";

const cardId = "EX13-010";

describe("EX13-010 Growlmon", () => {
  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Growlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      effectText:
        "[When Moving] [When Digivolving] Delete 1 of your opponent's Digimon with 4000 DP or less. If this effect didn't delete, this Digimon gains ＜Raid＞ and +3000 DP for the turn.",
      inheritedEffectText: "[All Turns] Add 2000 to this Digimon's DP deletion effects' maximums.",
    });
  });

  it("compiles the same clause under both printed timings plus the inherited modifier", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });

    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions).toHaveLength(3);

      // "Delete 1 of your opponent's Digimon with 4000 DP or less" — mandatory, one target,
      // opponent-only, printed numeric maximum.
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        target: {
          count: 1,
          filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } },
        },
      });
      expect(irNode(effect.actions[0]).optional).toBeUndefined();
      expect(irNode(effect.actions[0]).condition).toBeUndefined();

      // Both follow-ups are gated on the structured "didn't delete" condition and both target
      // this Digimon itself, so no selection decision is raised.
      expect(effect.actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Raid" },
        duration: "forTheTurn",
        condition: { kind: "ifThisEffectDidNotDelete" },
        target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "forTheTurn",
        condition: { kind: "ifThisEffectDidNotDelete" },
        target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      });
    }

    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "DeletionMaxDpModifier", amount: 2000, scope: "self", duration: "permanent" }],
    });
    // No "while ..." is printed on the inherited clause, so it carries no condition.
    expect(irNode(inherited.actions[0]).condition).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [When Digivolving] Delete 1 of your opponent's Digimon with 4000 DP or less.
  // ---------------------------------------------------------------------------

  it("deletes a 4000 DP opponent Digimon on the public digivolve route and gains nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: cardId, as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 20);

    // Source-stack identity survives: Monodramon sits beneath Growlmon, which is now the top.
    expect(s.perm("base").topCard?.cardId).toBe(cardId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
    // Cost 2 off a gauge of 3, plus the standard 1-card bonus draw on digivolution.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.players[0]!.deck.map(({ cardId: id }) => id)).toEqual([]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([]);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual(["BT1-014"]);
    // The deletion happened, so the "didn't delete" branch is skipped entirely.
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(false);
    expect(s.perm("base").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("discriminates the 4000 maximum: 4000 DP is deleted, 5000 DP is left alone", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: cardId, as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "outOfRange", dp: 5000 },
            { card: "BT1-014", as: "inRange", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    // Point the selection at the out-of-range Digimon: it must not even be offered, so the
    // 4000 DP one is the only candidate and is deleted anyway.
    preferInstanceIds.push(s.perm("outOfRange").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1, 20);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([
      s.inst("outOfRange").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("inRange").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(false);
    expect(s.perm("base").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // If this effect didn't delete, this Digimon gains ＜Raid＞ and +3000 DP for the turn.
  // ---------------------------------------------------------------------------

  it("gains Raid and +3000 DP when every opponent Digimon is above the maximum", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: cardId, as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "survivor", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Raid"), 20);

    expect(s.perm("base").topCard?.cardId).toBe(cardId);
    expect(s.perm("base").currentDP).toBe(9000);
    // The out-of-range Digimon is untouched and the grant is self-only.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([]);
    expect(observe(s.engine).hasKeyword(s.perm("survivor"), "Raid")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("gains Raid and +3000 DP when the opponent has no Digimon at all", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: cardId, as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Raid"), 20);

    expect(s.perm("base").currentDP).toBe(9000);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("treats an own 4000 DP Digimon as no target: 'your opponent's' discriminates", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "BT1-014", as: "ownSmall" },
          ],
          hand: [
            { card: cardId, as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Raid"), 20);

    // The own Digimon is never deleted, so the "didn't delete" branch fires instead.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([cardId, "BT1-014"]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([]);
    expect(s.perm("base").currentDP).toBe(9000);
    expect(observe(s.engine).hasKeyword(s.perm("ownSmall"), "Raid")).toBe(false);
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [When Moving] — the same clause on the public breeding-move route, plus the
  // "for the turn" duration expiring through the real turn loop.
  // ---------------------------------------------------------------------------

  it("fires the same clause when it moves out of breeding, and the grants expire at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "mover", under: ["BT1-009"] },
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "survivor", dp: 5000 }],
          security: ["BT1-010"],
          deck: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("mover"), "Raid"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([cardId]);
    expect(s.perm("mover").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.perm("mover").currentDP).toBe(9000);
    assertNoLoudGap(s);

    await settle(() => s.state.phase === "Main" && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === "Main");

    // "for the turn" expires at the end of the turn it was granted on.
    expect(observe(s.engine).hasKeyword(s.perm("mover"), "Raid")).toBe(false);
    expect(s.perm("mover").currentDP).toBe(6000);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("deletes through the breeding-move route too when a 4000 DP target exists", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "mover", under: ["BT1-009"] },
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "target" }],
          security: ["BT1-010"],
          deck: ["BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("target").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("mover"), "Raid")).toBe(false);
    expect(s.perm("mover").currentDP).toBe(6000);
    assertNoLoudGap(s);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Evolution legality: the printed requirement is a red Lv3 for cost 2.
  // ---------------------------------------------------------------------------

  it("refuses an illegal source: a red Lv4 is not a red Lv3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-014", as: "lv4Base" }],
          hand: [
            { card: cardId, as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lv4Base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toMatchObject({ ok: false });
    await drainMicrotasks(20);

    // No digivolution, so neither branch of the clause resolved.
    expect(s.perm("lv4Base").topCard?.cardId).toBe("BT1-014");
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-014"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] Add 2000 to this Digimon's DP deletion effects' maximums.
  // Comprehensive 15-15-4-1: the bonus adds to the value SHOWN IN TEXT.
  // ---------------------------------------------------------------------------

  it("raises a host's printed 8000 deletion maximum to 10000 from the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: [cardId] }],
          hand: [
            { card: "BT19-015", as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 20);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([cardId, "BT19-012"]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("target").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the host's printed 8000 maximum alone without Growlmon in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-012", as: "base", under: ["BT1-009"] }],
          hand: [
            { card: "BT19-015", as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 9000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks(20);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-009"]);
  });

  // ---------------------------------------------------------------------------
  // Cross-card / stack proof: EX13-007 Guilmon prints the identical inherited clause, so a
  // Guilmon beneath this Growlmon raises ITS OWN printed 4000 maximum to 6000 — and the
  // raised deletion then suppresses the Raid branch.
  // ---------------------------------------------------------------------------

  it("raises its own 4000 maximum to 6000 with EX13-007 Guilmon in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-007", as: "base" }],
          hand: [
            { card: cardId, as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "stillOutOfRange", dp: 7000 },
            { card: "BT1-014", as: "nowInRange", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1, 20);

    expect(s.perm("base").topCard?.cardId).toBe(cardId);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX13-007"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([
      s.inst("stillOutOfRange").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("nowInRange").instanceId]);
    // A deletion happened at the raised maximum, so the Raid/+3000 branch stays shut.
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Raid")).toBe(false);
    expect(s.perm("base").currentDP).toBe(6000);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("still takes the Raid branch above the raised 6000 maximum", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-007", as: "base" }],
          hand: [
            { card: cardId, as: "host" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "survivor", dp: 7000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Raid"), 20);

    expect(s.perm("base").currentDP).toBe(9000);
    expect(s.state.players[1]!.trash.map(({ cardId: id }) => id)).toEqual([]);
    assertNoLoudGap(s);
  });
});
