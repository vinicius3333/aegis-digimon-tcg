import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-039.js";

/** Appmon trait only: no [Game] and no [Invincible] trait, so it fits only the first add slot. */
const APPMON_ONLY = "BT21-009";
/** [Appmon] plus the [Game] attribute: an overlapping candidate for both add slots. */
const APPMON_AND_GAME = "BT23-016";
/** [Appmon] plus the [Invincible] type: the second printed alternative. */
const APPMON_AND_INVINCIBLE = "BT23-024";
/** Neither trait; always part of the returned remainder. */
const PLAIN = "BT1-009";

describe("BT23-039 Perorimon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-039")).toMatchObject({
      cardId: "BT23-039",
      nameEn: "Perorimon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["Entertainment"],
      types: ["Gourmet"],
      linkDp: 2000,
      linkEffect: "[When Linking] You may suspend 1 of your opponent's Digimon.",
      linkRequirement: "[Link] [Appmon] trait: Cost 1",
    });
    expect(getCardDefinition("BT23-039")?.effectText).toContain(
      "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Appmon]",
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ cost: 1, traits: ["Appmon"] }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("reveals three cards and adds one Appmon plus one Game/Invincible App Name card", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
          },
          count: 1,
          to: "hand",
        },
        {
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Game", "Invincible (App Name)", "Invincible"], match: "trait" }],
          },
          count: 1,
          to: "hand",
        },
      ],
    });
  });

  it("carries its Appmon link cost and linked suspend trigger", () => {
    expect(compiled.linkRequirement).toEqual([{ cost: 1, traits: ["Appmon"] }]);
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Suspend",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it("adds two distinct revealed cards on a public play and bottoms only the remainder", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-039", as: "perorimon" }],
          deck: [
            { card: APPMON_ONLY, as: "appmon" },
            { card: APPMON_AND_GAME, as: "game" },
            { card: PLAIN, as: "remainder" },
            { card: PLAIN, as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    // Bias the first (Appmon) slot to the Appmon-only card so the overlapping
    // [Game] card is still available for the second slot.
    prefer.push(s.inst("appmon").instanceId);
    const appmonId = s.inst("appmon").instanceId;
    const gameId = s.inst("game").instanceId;
    const remainderId = s.inst("remainder").instanceId;
    const untouchedId = s.inst("untouched").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("perorimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === gameId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual([appmonId, gameId].sort());
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([untouchedId, remainderId]);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("perorimon").instanceId,
      ),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("adds an Invincible App Name card to the second slot", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-039", as: "perorimon" }],
          deck: [
            { card: APPMON_ONLY, as: "appmon" },
            { card: APPMON_AND_INVINCIBLE, as: "invincible" },
            { card: PLAIN, as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("appmon").instanceId);
    const appmonId = s.inst("appmon").instanceId;
    const invincibleId = s.inst("invincible").instanceId;
    const remainderId = s.inst("remainder").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("perorimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === invincibleId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual([appmonId, invincibleId].sort());
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([remainderId]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("adds a single overlapping card only once and returns the rest in revealed order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-039", as: "perorimon" }],
          deck: [
            { card: APPMON_AND_GAME, as: "overlap" },
            { card: PLAIN, as: "firstRest" },
            { card: PLAIN, as: "secondRest" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const overlapId = s.inst("overlap").instanceId;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("perorimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === overlapId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([overlapId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("adds nothing when no revealed card carries either trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-039", as: "perorimon" }],
          deck: [
            { card: PLAIN, as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
            { card: "BT1-012", as: "fourth" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("perorimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.deck[0]?.instanceId === s.inst("fourth").instanceId &&
        s.state.players[0]!.deck.length === 4,
    );

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("fourth").instanceId,
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("links for 1 memory, contributes 2000 DP and suspends only an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: APPMON_ONLY, as: "host" },
            { card: PLAIN, as: "ownBystander" },
          ],
          hand: [{ card: "BT23-039", as: "linker" }],
        },
        1: { battleArea: [{ card: PLAIN, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const baseDp = s.perm("host").currentDP;
    const linkerId = s.inst("linker").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([linkerId]);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("ownBystander").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("does not fire when the opponent has no Digimon and keeps the paid link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: APPMON_ONLY, as: "host" }],
          hand: [{ card: "BT23-039", as: "linker" }],
        },
        // The opponent controls no Digimon, so the optional suspend has no legal target.
        1: { hand: [PLAIN] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const linkerId = s.inst("linker").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === linkerId));

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(getCardDefinition(APPMON_ONLY)!.dp + 2000);
    assertNoLoudGap(s);
  });

  it("may refuse the linked suspend without undoing the paid link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: APPMON_ONLY, as: "host" }],
          hand: [{ card: "BT23-039", as: "linker" }],
        },
        1: { battleArea: [{ card: PLAIN, as: "opponent" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    const linkerId = s.inst("linker").instanceId;
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === linkerId));

    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    assertNoLoudGap(s);
  });

  it("is trashed and stops contributing DP when a later link replaces it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: APPMON_ONLY, as: "host" }],
          hand: [
            { card: "BT23-039", as: "linker" },
            { card: APPMON_AND_GAME, as: "replacement" },
          ],
          deck: [{ card: PLAIN, as: "drawn" }, PLAIN],
        },
        1: { battleArea: [{ card: PLAIN, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;
    const linkerId = s.inst("linker").instanceId;
    const replacementId = s.inst("replacement").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkerId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: replacementId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === linkerId));

    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([replacementId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([linkerId]);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("rejects linking to a non-Appmon host without spending memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: PLAIN, as: "host" }], hand: [{ card: "BT23-039", as: "linker" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linker").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("linker").instanceId);
    expect(s.perm("host").linked).toHaveLength(0);
  });

  // The public Link route feeds the public App Fusion route: Perorimon is linked to a Dokamon
  // host by the controller's own `linkCard` intent, and BT23-021 Dosukomon then consumes that
  // exact linked card as an [App Fusion] material.
  it("is consumed as an App Fusion material after being linked publicly", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: APPMON_AND_GAME, as: "dokamon" }],
          hand: [
            { card: "BT23-039", as: "perorimon" },
            { card: "BT23-021", as: "dosukomon" },
          ],
          deck: [{ card: PLAIN, as: "bonusDraw" }, PLAIN, PLAIN],
        },
        1: { battleArea: [{ card: PLAIN, as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const dokamonId = s.inst("dokamon").instanceId;
    const perorimonId = s.inst("perorimon").instanceId;
    const dosukomonId = s.inst("dosukomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: perorimonId,
        targetPermanentId: s.perm("dokamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dokamon").linked.some((card) => card.instanceId === perorimonId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("dokamon").currentDP).toBe(getCardDefinition(APPMON_AND_GAME)!.dp + 2000);

    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("dokamon").permanentId,
        instanceId: dosukomonId,
        linkedInstanceId: perorimonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dokamon").topCard.instanceId === dosukomonId);

    // The printed App Fusion cost is 0, so the two memory left by the link are untouched.
    expect(s.state.memory).toBe(2);
    expect(s.perm("dokamon").stack.map((card) => card.instanceId)).toEqual([dokamonId, perorimonId]);
    expect(s.perm("dokamon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "digivolved", mechanic: "appFusion", cardId: "BT23-021" }),
    );
    assertNoLoudGap(s);
  });

  it("digivolves for 0 from a hatched off-color level-2 Appmon and rejects a level-2 non-Appmon", async () => {
    const legal = setupEngine({
      0: {
        eggDeck: [{ card: "BT23-001", as: "egg" }],
        hand: [{ card: "BT23-039", as: "perorimon" }],
        deck: [{ card: PLAIN, as: "bonus" }, PLAIN],
      },
    });
    // The egg is hatched in the production Breeding phase opened by the real turn loop.
    const legalLoop = legal.engine.startTurnLoop();
    await settle(() => legal.state.phase === Phase.Breeding);
    expect(legal.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.breeding?.topCard?.instanceId === legal.inst("egg").instanceId);
    await advance(legal.engine).waitForMainPhase(0);
    const handBefore = legal.state.players[0]!.hand.length;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.state.players[0]!.breeding!.permanentId,
        instanceId: legal.inst("perorimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.state.players[0]!.breeding?.topCard?.instanceId === legal.inst("perorimon").instanceId);

    const breeding = legal.state.players[0]!.breeding!;
    expect(breeding.topCard!.instanceId).toBe(legal.inst("perorimon").instanceId);
    expect(breeding.stack.map((card) => card.instanceId)).toEqual([legal.inst("egg").instanceId]);
    expect(legal.state.memory).toBe(0);
    // The evolution bonus draw replaces the played card in hand.
    expect(legal.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([legal.inst("bonus").instanceId]);
    expect(legal.state.players[0]!.hand).toHaveLength(handBefore);
    assertNoLoudGap(legal);
    expect(legal.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await legalLoop;

    const illegal = setupEngine({
      0: {
        eggDeck: [{ card: "BT21-003", as: "egg" }],
        hand: [{ card: "BT23-039", as: "perorimon" }],
        deck: [PLAIN],
      },
    });
    const illegalLoop = illegal.engine.startTurnLoop();
    await settle(() => illegal.state.phase === Phase.Breeding);
    expect(illegal.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => illegal.state.players[0]!.breeding?.topCard?.instanceId === illegal.inst("egg").instanceId);
    await advance(illegal.engine).waitForMainPhase(0);

    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.state.players[0]!.breeding!.permanentId,
        instanceId: illegal.inst("perorimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(illegal.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      illegal.inst("perorimon").instanceId,
    );
    expect(illegal.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await illegalLoop;
  });
});
