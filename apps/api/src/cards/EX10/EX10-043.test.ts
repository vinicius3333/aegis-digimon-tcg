import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-043.js";
import "../index.js";

const CARD_ID = "EX10-043";

/**
 * EX10-043 Sakusimon (Purple Lv.4 [Sup.]/[Appmon], DP 5000, play cost 5,
 * [Digivolve] Purple Lv.3: Cost 2, link DP +3000, [Link] [Appmon] trait: Cost 2).
 *
 * Printed clauses:
 *  1. [On Play] [When Digivolving] Delete 1 of your opponent's level 3 Digimon.
 *  2. [All Turns] [Once Per Turn] When effects trash any of this Digimon's link cards,
 *     gain 1 memory.
 *  3. Link effect: [When Attacking] By trashing 1 of this Digimon's link cards, delete 1
 *     of your opponent's level 4 or lower Digimon.
 *
 * Q&A covered: Q5123 (the link effect may trash this card itself), Q5124 (a rule-driven
 * link replacement does not trigger the [All Turns] clause), Q5125 (with ＜Link +X＞ the
 * link effect may trash a DIFFERENT link card of the same host).
 *
 * Fixtures: BT1-013 (inert Lv.3), BT1-014 (inert Lv.4), BT1-020 (inert Lv.5), ST6-05
 * (inert Purple Lv.3, the digivolution source), BT26-086 Dantemon (＜Link +6＞ [Appmon]
 * multi-link host), EX10-038 Copipemon ([Appmon] Lv.3, a legal link card).
 */
describe("EX10-043 Sakusimon", () => {
  it("records the exact catalog and Link requirement", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Sakusimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Sup.", "Appmon"],
      attributes: ["Game"],
      types: ["Simulation", "Leviathan"],
      linkDp: 3000,
    });
    // The catalog stores a U+00A0 after the bracketed keyword (a repo-wide scrape artifact),
    // so the printed requirement is compared with whitespace normalized.
    expect(getCardDefinition(CARD_ID)!.linkRequirement!.replace(/\s+/gu, " ")).toBe("[Link] [Appmon] trait: Cost 2");
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("maps every printed clause onto the compiled IR", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } } },
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "linked", isSelfRef: true }, count: 1 },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // Clause 1 — [On Play] / [When Digivolving] delete 1 opposing level 3 Digimon
  // ---------------------------------------------------------------------------

  it("[On Play] played from hand deletes exactly 1 opposing level-3 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "sakusimon" }, "BT1-013"] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 5;
    await s.ready();
    preferred.push(s.perm("level3").topCard!.instanceId, s.perm("level3").permanentId);
    const level4Id = s.perm("level4").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakusimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([level4Id]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    // Play cost 5 paid from 5 memory; nothing else touches memory on this line.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] with no opposing level-3 Digimon deletes nothing and leaves no pending decision", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "sakusimon" }, "BT1-013"] },
        1: {
          battleArea: [
            { card: "BT1-014", as: "level4" },
            { card: "BT1-020", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sakusimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-014", "BT1-020"]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving] over a Purple Lv.3 for 2 memory deletes 1 opposing level-3 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-05", as: "source" }],
          hand: [{ card: CARD_ID, as: "sakusimon" }, "BT1-013"],
          deck: ["BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "level3" },
            { card: "BT1-014", as: "level4" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 2;
    await s.ready();
    preferred.push(s.perm("level3").topCard!.instanceId, s.perm("level3").permanentId);
    const sourceInstanceId = s.inst("source").instanceId;
    const level4Id = s.perm("level4").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("sakusimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // The evolved permanent keeps its identity: Sakusimon on top, ST6-05 as the only
    // digivolution card beneath it.
    expect(s.perm("source").topCard?.cardId).toBe(CARD_ID);
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([level4Id]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    // Digivolution cost 2 paid, then the bonus draw took the only deck card.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal digivolution source: a Red Lv.3 does not meet [Digivolve] Purple Lv.3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "red" }],
        hand: [{ card: CARD_ID, as: "sakusimon" }, "BT1-013"],
        deck: ["BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-013", as: "level3" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("red").permanentId,
        instanceId: s.inst("sakusimon").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("red").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Link requirement
  // ---------------------------------------------------------------------------

  it("links only onto an [Appmon] host, costs 2 memory and contributes +3000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT21-009", as: "appmon" },
          { card: "BT1-009", as: "plain" },
        ],
        hand: [{ card: CARD_ID, as: "sakusimon" }, "BT1-013"],
      },
    });
    s.state.memory = 2;
    await s.ready();
    const base = s.perm("appmon").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("sakusimon").instanceId,
        targetPermanentId: s.perm("plain").permanentId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("sakusimon").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));

    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(base + 3000);
    expect(s.perm("plain").linked).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Clause 3 — link effect [When Attacking]
  // ---------------------------------------------------------------------------

  it("Q5123 the link effect trashes this card itself to delete an opposing level-4 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", dp: 20_000, linked: [{ card: CARD_ID, as: "sakusimon" }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "level4" },
            { card: "BT1-020", as: "level5" },
          ],
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("sakusimon").instanceId, s.perm("level4").topCard!.instanceId, s.perm("level4").permanentId);
    const sakusimonInstanceId = s.inst("sakusimon").instanceId;
    const level5Id = s.perm("level5").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    // The cost trashed the link card itself; the level 5 Digimon is out of range.
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(sakusimonInstanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([level5Id]);
    // The security card checked by the attack lands in the same trash, so only the deleted
    // Digimon is asserted here.
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-014");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5125 with ＜Link +6＞ the link effect may trash a different link card of the same host", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-086",
              as: "host",
              dp: 20_000,
              linked: [
                { card: CARD_ID, as: "sakusimon" },
                { card: "EX10-038", as: "other" },
              ],
            },
            { card: "BT21-009", as: "neighbor", linked: [{ card: CARD_ID, as: "neighborLink" }] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "level4" },
            { card: "BT1-020", as: "level5" },
          ],
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    // Steer the cost onto the OTHER link card, and the deletion onto the level 4 Digimon.
    preferred.push(s.inst("other").instanceId, s.perm("level4").topCard!.instanceId, s.perm("level4").permanentId);
    const sakusimonInstanceId = s.inst("sakusimon").instanceId;
    const otherInstanceId = s.inst("other").instanceId;
    const level5Id = s.perm("level5").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([sakusimonInstanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(otherInstanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([level5Id]);
    // Another Digimon's link card is never a legal cost for this host's link effect.
    expect(s.perm("neighbor").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("neighborLink").instanceId]);
  });

  it("declining the link effect pays nothing and deletes nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", dp: 20_000, linked: [{ card: CARD_ID, as: "sakusimon" }] }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "level4" }], security: ["BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const level4Id = s.perm("level4").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").linked.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([level4Id]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("the link effect cannot reach a level-5 Digimon: with no legal target nothing is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", dp: 20_000, linked: [{ card: CARD_ID, as: "sakusimon" }] }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "level5" }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const level5Id = s.perm("level5").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([level5Id]);
    expect(s.perm("host").linked.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Clause 2 — [All Turns] [Once Per Turn] gain 1 memory on an effect link trash
  // ---------------------------------------------------------------------------

  it("gains 1 memory when an effect trashes its own link card, through the natural attack window", async () => {
    // Sakusimon hosts a second Sakusimon as its link card. Attacking fires the LINK copy's
    // [When Attacking] effect, whose cost trashes a link card of the host — a genuine
    // effect trash of "this Digimon's link cards", so the host's [All Turns] clause pays out.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "sakusimon", dp: 20_000, linked: [{ card: CARD_ID, as: "link" }] }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "level4" }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 0;
    await s.ready();
    preferred.push(s.inst("link").instanceId, s.perm("level4").topCard!.instanceId, s.perm("level4").permanentId);
    const linkInstanceId = s.inst("link").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakusimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(s.perm("sakusimon").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([linkInstanceId]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-014");
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5124 a rule-driven link replacement trashes the old link card without gaining memory", async () => {
    // Linking a second card onto a Digimon already at its limit puts the board over the
    // link cap; CR §4-9-5 rule processing trashes the EXISTING link card. That trash is
    // rule processing, not an effect, so the [All Turns] clause must not pay out.
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "sakusimon", linked: [{ card: "EX10-038", as: "oldLink" }] }],
        hand: [{ card: "BT26-010", as: "newLink" }, "BT1-013"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const oldLinkInstanceId = s.inst("oldLink").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("newLink").instanceId,
        targetPermanentId: s.perm("sakusimon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("sakusimon").linked.length === 1 &&
        s.perm("sakusimon").linked[0]!.cardId === "BT26-010" &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([oldLinkInstanceId]);
    // Link cost 3 for BT26-010 paid from 3 memory. No memory was gained by the rule trash.
    expect(s.state.memory).toBe(0);
  });

  it("gains no memory when an effect trashes ANOTHER Digimon's link card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "sakusimon", linked: [{ card: "EX10-038", as: "own" }] },
          { card: "BT21-009", as: "neighbor", linked: [{ card: "EX10-038", as: "neighborLink" }] },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("neighborLink").instanceId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.trash([s.inst("own").instanceId]);
    expect(s.state.memory).toBe(1);
  });

  it("[Once Per Turn]: a second effect link trash in the same turn gains no further memory", async () => {
    // Structural note on the fixture: Sakusimon prints no ＜Link +X＞ and no public
    // affordance grants one (seam `testkit-link-grant-affordance`), so a board with two
    // link cards on one Sakusimon can only be seeded. Nothing here runs rule processing,
    // so CR §4-9-5 never trims the seeded pair. Injected origin, structural credit only.
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: CARD_ID,
            as: "sakusimon",
            linked: [
              { card: "EX10-038", as: "first" },
              { card: "EX10-038", as: "second" },
            ],
          },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("first").instanceId]);
    expect(s.state.memory).toBe(1);
    await advance(s.engine).verb.trash([s.inst("second").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.perm("sakusimon").linked).toHaveLength(0);
  });

  it("[Once Per Turn] resets on the next own turn, proved through the real turn loop", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "sakusimon", linked: [{ card: "EX10-038", as: "firstLink" }] }],
        hand: [{ card: "EX10-038", as: "secondLink" }, "BT1-013"],
        deck: ["BT1-013", "BT1-014", "BT1-009"],
        security: ["BT1-013", "BT1-014", "BT1-009"],
      },
      1: {
        hand: ["BT1-013"],
        deck: ["BT1-013", "BT1-014", "BT1-009"],
        security: ["BT1-013", "BT1-014", "BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const beforeFirst = s.state.memory;
    await advance(s.engine).verb.trash([s.inst("firstLink").instanceId]);
    expect(s.state.memory).toBe(beforeFirst + 1);
    expect(s.perm("sakusimon").linked).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    // Re-arm the board: EX10-038 links onto the [Appmon] Sakusimon for 1 memory.
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("sakusimon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sakusimon").linked.length === 1);

    const beforeSecond = s.state.memory;
    await advance(s.engine).verb.trash([s.inst("secondLink").instanceId]);
    // FAILS WHEN REVERTED: a once-per-game gate (or a gate that never resets) leaves this
    // at `beforeSecond`.
    expect(s.state.memory).toBe(beforeSecond + 1);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
