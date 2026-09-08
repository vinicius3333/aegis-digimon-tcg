import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-039.js";
import "../index.js";

const CARD_ID = "EX10-039";

/**
 * EX10-039 ChuuChuumon (Purple Lv.3 Rookie, [Beast]/[Bagra Army]).
 *
 * "[Start of Your Main Phase] You may place 1 Digimon card with the [Bagra Army] trait from
 *  your hand or trash as any of your [Bagra Army] trait Digimon's bottom digivolution cards
 *  or under any of your [Bagra Army] trait Tamers.
 *  [On Deletion] ＜Save＞"
 * Inherited: "When effects trash this card from a [Bagra Army] trait Digimon's digivolution
 * cards, ＜Draw 1＞".
 *
 * KB Q5119: the placed card goes to the BOTTOM of a Tamer's existing stack.
 *
 * Fixture note: every [Bagra Army] Digimon card in the catalog is purple or black, so the
 * Bagra Army Tamer used here (BT10-093 Yuu Amano) also sees its own "when a purple card is
 * placed under this Tamer" trigger. That is a real peer interaction, asserted below rather
 * than avoided.
 */
describe("EX10-039 ChuuChuumon", () => {
  it("records the exact catalog and printed text", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "ChuuChuumon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Beast", "Bagra Army"],
      effectText:
        "[Start of Your Main Phase] You may place 1 Digimon card with the [Bagra Army]\u00A0trait from your hand or trash as any of your [Bagra Army]\u00A0trait Digimon's bottom digivolution cards or under any of your [Bagra Army]\u00A0trait Tamers.\n[On Deletion] ＜Save＞",
      inheritedEffectText:
        "When effects trash this card from a [Bagra Army]\u00A0trait Digimon's digivolution cards, ＜Draw 1＞",
    });
    expect(getCardDefinition(CARD_ID)!.securityEffectText ?? "").toBe("");
  });

  it("compiles both placements to bottom, the ＜Save＞ keyword and the inherited draw watcher", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 1,
            from: ["hand", "trash"],
          },
          underFilter: {
            controller: "mine",
            or: [
              { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
              { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
            ],
          },
          position: "bottom",
          optional: true,
        },
      ],
    });
    // Regression guard for the defect this audit fixed: without `position: "bottom"` the
    // shared PlaceUnder path passes `belowTop: true` and the saved card lands directly
    // beneath the Tamer instead of at the bottom of its stack (KB Q5119, CR 4-3).
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
          position: "bottom",
          optional: true,
        },
      ],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });

  it("Q5119: the start-of-main placement lands at a [Bagra Army] Tamer's true bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            {
              card: "BT10-093",
              as: "bagraTamer",
              under: [
                { card: "BT1-009", as: "u1" },
                { card: "BT1-013", as: "u2" },
              ],
            },
            // Negatives: a Tamer without the [Bagra Army] trait ([Hunter]) whose only text is
            // [On Play], and a
            // Digimon without it ([Mini Dragon]). Neither may host the placement.
            { card: "BT7-086", as: "plainTamer" },
            { card: "BT1-009", as: "plainDigimon", dp: 20_000 },
          ],
          // BT14-057 is a [Bagra Army] Digimon card; BT1-014 is not, so it must never be
          // offered as a placement candidate.
          trash: [
            { card: "BT14-057", as: "material" },
            { card: "BT1-014", as: "nonBagra" },
          ],
          hand: ["BT1-013"],
          deck: ["BT14-059", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013"], hand: ["BT1-013"], security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("bagraTamer").permanentId);
    const materialId = s.inst("material").instanceId;
    const nonBagraId = s.inst("nonBagra").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("bagraTamer").stack.length === 3);

    // Bottom, not "directly beneath the Tamer": the existing two cards keep their order above.
    expect(s.perm("bagraTamer").stack.map((card) => card.instanceId)).toEqual([
      materialId,
      s.inst("u1").instanceId,
      s.inst("u2").instanceId,
    ]);
    // Placement, not play: the card left the trash and nothing else moved.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([nonBagraId]);
    expect(s.perm("plainTamer").stack).toHaveLength(0);
    expect(s.perm("plainDigimon").stack).toHaveLength(0);
    // The host candidates are exactly the controller's [Bagra Army] permanents: this
    // ChuuChuumon (itself a [Bagra Army] Digimon) and the [Bagra Army] Tamer. The
    // non-[Bagra Army] Tamer and the [Mini Dragon] Digimon were never offered.
    const hostChoice = s.decisions.find(({ req }) => req.kind === "chooseTargets");
    expect(hostChoice?.req.options?.candidateInstanceIds).toEqual([
      s.perm("source").permanentId,
      s.perm("bagraTamer").permanentId,
    ]);
    // The non-[Bagra Army] trash card was not eligible, so no card selection was even asked.
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("peer interaction: BT10-093 sees the purple card placed under it and draws 1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "BT10-093", as: "bagraTamer" },
          ],
          trash: [{ card: "BT14-057", as: "material" }],
          hand: ["BT1-013"],
          deck: ["BT14-059", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013"], hand: ["BT1-013"], security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("bagraTamer").permanentId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // The peer Tamer's draw fires off the same placement, in the same continuation, so by the
    // time the placement settles the draw has already happened — there is no later deck-size
    // drop to wait for.
    await settle(
      () =>
        s.perm("bagraTamer").stack.length === 1 && s.state.players[0]!.hand.some((card) => card.cardId === "BT14-059"),
    );

    expect(s.perm("bagraTamer").stack.map((card) => card.cardId)).toEqual(["BT14-057"]);
    // BT10-093: "When a purple card is placed under this Tamer, ＜Draw 1＞ and gain 1 memory."
    // BT14-057 is Black/Purple, so the peer Tamer's own trigger fires off this placement.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT14-059");
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("places under a [Bagra Army] Digimon as its bottom digivolution card, from hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            {
              card: "BT14-057",
              as: "bagraHost",
              dp: 20_000,
              under: [
                { card: "BT1-009", as: "u1" },
                { card: "BT1-013", as: "u2" },
              ],
            },
            { card: "BT7-086", as: "plainTamer" },
            { card: "BT1-009", as: "plainDigimon", dp: 20_000 },
          ],
          hand: [{ card: "BT14-059", as: "material" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013"], hand: ["BT1-013"], security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("bagraHost").permanentId);
    const materialId = s.inst("material").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("bagraHost").stack.length === 3);

    expect(s.perm("bagraHost").stack.map((card) => card.instanceId)).toEqual([
      materialId,
      s.inst("u1").instanceId,
      s.inst("u2").instanceId,
    ]);
    expect(s.perm("bagraHost").topCard!.cardId).toBe("BT14-057");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(materialId);
    expect(s.perm("plainTamer").stack).toHaveLength(0);
    expect(s.perm("plainDigimon").stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declines the optional placement and leaves every zone untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "BT10-093", as: "bagraTamer", under: [{ card: "BT1-009", as: "u1" }] },
          ],
          trash: [{ card: "BT14-057", as: "material" }],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013"], hand: ["BT1-013"], security: ["BT1-009", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => false, 40);

    expect(s.perm("bagraTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("u1").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("material").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Save＞ puts the battle-deleted ChuuChuumon at the true bottom of the Tamer's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "chuu" },
            {
              card: "BT12-094",
              as: "tamer",
              under: [
                { card: "BT1-009", as: "u1" },
                { card: "BT1-013", as: "u2" },
              ],
            },
          ],
          hand: ["BT1-013"],
        },
        // 1000 DP attacking into 20000 DP: ChuuChuumon is deleted by the real battle.
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const chuuId = s.inst("chuu").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chuu").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 3);
    await settle(() => false, 30);

    // KB Q5119 / CR 4-3: bottom of the existing stack, not directly beneath the Tamer.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      chuuId,
      s.inst("u1").instanceId,
      s.inst("u2").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard!.cardId)).toEqual(["BT12-094"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("＜Save＞ declined, and with no Tamer the deleted card goes to the trash", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "chuu" },
            { card: "BT12-094", as: "tamer", under: [{ card: "BT1-009", as: "u1" }] },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }], security: ["BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    const declinedId = declined.inst("chuu").instanceId;
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("chuu").permanentId,
        target: { kind: "permanent", permanentId: declined.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[0]!.trash.length === 1);
    expect(declined.perm("tamer").stack.map((card) => card.instanceId)).toEqual([declined.inst("u1").instanceId]);
    expect(declined.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([declinedId]);

    const noTamer = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "chuu" }], hand: ["BT1-013"] },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await noTamer.ready();
    const orphanId = noTamer.inst("chuu").instanceId;
    expect(
      noTamer.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: noTamer.perm("chuu").permanentId,
        target: { kind: "permanent", permanentId: noTamer.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => noTamer.state.players[0]!.trash.length === 1);
    expect(noTamer.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([orphanId]);
    expect(noTamer.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("public route: the opponent's BT15-019 trashes ChuuChuumon from my [Bagra Army] host and I draw 1", async () => {
    // Public route into `onDigivolutionCardsDiscardedBatch`: BT15-019 Crabmon's
    // `[On Play] Trash the bottom digivolution card of 1 of your opponent's Digimon`
    // (`TrashDigivolution` with `fromTop: false`), played by seat 1 through the `playCard`
    // intent on seat 1's own turn. ＜De-Digivolve＞ is NOT such a route: `peelStackTops`
    // trashes the current TOP card and fires `whenDigimonTopTrashed`, never
    // `onDigivolutionCardsDiscardedBatch` — that event comes only from
    // `trashDigivolutionCards` / `trashDigivolutionCardsAtomic`
    // (apps/api/src/engine/effects/primitives.ts).
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              // BT14-057 ChuuChuumon: [Bagra Army], and its only main text is [On Deletion]
              // ＜Save＞, so it stays inert while it hosts the stack.
              card: "BT14-057",
              as: "bagraHost",
              under: [
                { card: CARD_ID, as: "source" },
                { card: "BT1-009", as: "aboveSource" },
              ],
            },
          ],
          hand: ["BT1-013"],
          deck: ["BT14-059", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-014"],
        },
        1: {
          hand: [
            { card: "BT15-019", as: "crabmon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    // `state.memory` is turn-relative: on seat 1's turn a positive value is seat 1's memory.
    s.state.memory = 6;
    const myHandBefore = s.state.players[0]!.hand.length;
    const myDeckBefore = s.state.players[0]!.deck.length;
    const theirHandBefore = s.state.players[1]!.hand.length;
    const sourceId = s.inst("source").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === myHandBefore + 1 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    // `fromTop: false` — the BOTTOM digivolution card (this ChuuChuumon) left the stack.
    expect(s.perm("bagraHost").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("aboveSource").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    // The inherited clause resolved for ME, the owner of the trashed card, on the OPPONENT's
    // turn: exactly 1 card off the top of my deck into my hand.
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT14-059");
    expect(s.state.players[0]!.deck).toHaveLength(myDeckBefore - 1);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    // My host still has a digivolution card, so Crabmon's own "then" draw did not run: seat 1
    // is down exactly the Crabmon it played.
    expect(s.state.players[1]!.hand).toHaveLength(theirHandBefore - 1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard!.cardId)).toEqual(["BT15-019"]);
    // Seat 1 paid 3 for Crabmon out of the 6 seeded; nothing else touched memory.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-014"]);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("public route negative: the same BT15-019 trash off a non-[Bagra Army] host draws nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // BT1-009 is [Mini Dragon] with no text at all: the host-trait gate must block.
            {
              card: "BT1-009",
              as: "plainHost",
              under: [
                { card: CARD_ID, as: "source" },
                { card: "BT1-013", as: "aboveSource" },
              ],
            },
          ],
          hand: ["BT1-013"],
          deck: ["BT14-059", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-014"],
        },
        1: {
          hand: [
            { card: "BT15-019", as: "crabmon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 6;
    const myHandBefore = s.state.players[0]!.hand.length;
    const sourceId = s.inst("source").instanceId;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("crabmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 1 && s.state.pendingDecision === undefined);
    await settle(() => false, 40);

    // Same trash, same event, different host trait: the card moved, the draw did not happen.
    expect(s.perm("plainHost").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("aboveSource").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand).toHaveLength(myHandBefore);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT14-059", "BT1-013", "BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Structural companion to the two public-route tests above: the same watcher driven straight
  // through the production verb behind the Advance Surface. Kept for the tight host-trait
  // contrast; it earns no behavioural credit on its own.
  it("structural: the inherited watcher draws only when effects trash it from a [Bagra Army] host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-026", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 0);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);

    // BT1-009 is [Mini Dragon], not [Bagra Army]: same trash, no draw.
    const blocked = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-009"],
      },
    });
    await blocked.ready();
    await advance(blocked.engine).verb.trashDigivolutionCards(
      blocked.perm("host").permanentId,
      [blocked.inst("source").instanceId],
      0,
    );
    await settle(() => false, 30);
    expect(blocked.state.players[0]!.hand).toHaveLength(0);
    expect(blocked.state.players[0]!.deck).toHaveLength(1);
  });
});
