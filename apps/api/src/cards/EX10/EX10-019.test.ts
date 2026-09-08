import { describe, expect, it } from "vitest";
import { appFusionCostFor, EffectDuration, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-019.js";
import "../index.js";

const CARD_ID = "EX10-019";

/**
 * EX10-019 Warudamon (Lv.5 Green/Purple, [Ult.]/[Appmon], 8000 DP).
 *
 * Printed text:
 *   [App Fusion] [Mienumon] & [Sakusimon]: Cost 0
 *   ＜Fortitude＞
 *   [On Play] [When Digivolving] You may link 1 level 4 or lower Digimon card from your
 *     trash or this Digimon's digivolution cards to this Digimon without paying the cost.
 *   [All Turns] [Once Per Turn] When this Digimon gets linked, you may suspend 1 of your
 *     opponent's Digimon or Tamers. It can't unsuspend in their next unsuspend phase.
 *   [Link] [Appmon] trait: Cost 3   Link DP +4000
 *   Link effect: [All Turns] When any of your opponent's Digimon suspend, by trashing 1 of
 *     this Digimon's link cards, trash your opponent's top security card.
 *
 * Every behavioural clause below is driven from a public intent (`playCard`, `digivolve`,
 * `appFusion`, `linkCard`, `attack`, `declareBlock`) or the real turn loop. A suspension of
 * an opponent's Digimon is produced naturally by a declared block or by this card's own
 * [All Turns] clause, never by injected timing.
 */
describe("EX10-019 Warudamon", () => {
  it("records the exact catalog, App Fusion, Fortitude, Link, and scoped watchers", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Green", "Purple"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      forms: ["Ult.", "Appmon"],
      attributes: ["System"],
      types: ["Strategy", "Leviathan"],
      linkDp: 4000,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Mienumon", "Sakusimon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Fortitude" }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Link",
            from: ["trash", "digivolutionCards"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                hasLinkRequirement: true,
                or: [{ zone: "trash" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
              },
            },
            recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && effect.frequency)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "SelectBind", optional: true, abortOnDecline: true },
            { kind: "Suspend", target: { fromSelectionRef: "warudamonTarget" } },
            {
              kind: "Restrict",
              restriction: "unsuspend",
              duration: "untilOpponentNextUnsuspendPhase",
              target: { fromSelectionRef: "warudamonTarget" },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && effect.isLinked)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              cost: { target: { filter: { zone: "linked", isSelfRef: true }, count: 1 } },
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["green", "BT1-071"],
    ["purple", "BT10-074"],
  ])("uses the normal %s level-4 route for exactly 4", async (_color, baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: CARD_ID, as: "warudamon" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual([baseCard]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Fortitude")).toBe(true);
    assertNoLoudGap(s);
  });

  it("refuses an off-colour level-4 source: the printed routes are Green and Purple only", async () => {
    const s = setupEngine({
      0: {
        // BT24-035 Gatomon: Yellow, level 4 - the right level on the wrong colour.
        battleArea: [{ card: "BT24-035", as: "yellowBase" }],
        hand: [{ card: CARD_ID, as: "warudamon" }],
        deck: ["BT1-013"],
      },
    });
    s.state.memory = 8;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("warudamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("yellowBase").topCard.cardId).toBe("BT24-035");
    expect(s.state.memory).toBe(8);
  });

  it("performs the exact zero-cost App Fusion pair through the public appFusion intent", async () => {
    expect(appFusionCostFor(CARD_ID, { topName: "Mienumon", linkedNames: ["Sakusimon"] })).toBe(0);
    expect(appFusionCostFor(CARD_ID, { topName: "Sakusimon", linkedNames: ["Mienumon"] })).toBe(0);
    expect(appFusionCostFor(CARD_ID, { topName: "Mienumon", linkedNames: ["Mienumon"] })).toBeUndefined();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-017", as: "fuser", linked: [{ card: "EX10-043", as: "sakusimon" }] }],
          hand: [{ card: CARD_ID, as: "warudamon" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("fuser").permanentId,
        instanceId: s.inst("warudamon").instanceId,
        linkedInstanceId: s.inst("sakusimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("fuser").topCard.cardId === CARD_ID);
    expect(s.perm("fuser").stack.map(({ cardId }) => cardId)).toContain("EX10-017");
    expect(s.perm("fuser").linked).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    assertNoLoudGap(s);
  });

  it("Q5053 [On Play] links only a level-4-or-lower card that has ＜Link＞, from trash, for free", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "warudamon" }, "BT1-013"],
          trash: [
            // BT24-035 Gatomon: level 4 but NO printed [Link] requirement (Q5053).
            { card: "BT24-035", as: "noLink" },
            // BT24-053 Protecmon: level 3, [Link] [Appmon] trait.
            { card: "BT24-053", as: "eligible" },
            // BT21-101 Gaiamon: has [Link]... on a level 6 body, so out of range.
            { card: "BT21-101", as: "tooBig" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("warudamon").linked.length === 1);

    expect(s.perm("warudamon").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("eligible").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("noLink").instanceId,
      s.inst("tooBig").instanceId,
    ]);
    // Play cost 8 only; the link itself is free.
    expect(s.state.memory).toBe(0);
    // 8000 printed + Protecmon's own Link DP +2000.
    expect(s.perm("warudamon").currentDP).toBe(10_000);
    assertNoLoudGap(s);

    // Negative control: with ONLY ineligible cards in the trash nothing is linked at all,
    // which is what proves the level and ＜Link＞ gates rather than a lucky pick order.
    const none = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "warudamon" }, "BT1-013"],
          trash: [
            { card: "BT24-035", as: "noLink" },
            { card: "BT21-101", as: "tooBig" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    none.state.memory = 8;
    await none.ready();
    expect(none.engine.applyIntent(0, { type: "playCard", instanceId: none.inst("warudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => none.state.players[0]!.battleArea.length === 1);
    await settle(() => false, 40);
    expect(none.perm("warudamon").linked).toHaveLength(0);
    expect(none.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      none.inst("noLink").instanceId,
      none.inst("tooBig").instanceId,
    ]);
    assertNoLoudGap(none);
  });

  it("[When Digivolving] offers only this Digimon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-071", as: "base", under: [{ card: "BT24-053", as: "ownSource" }] },
            { card: "BT1-071", as: "neighbor", under: [{ card: "BT24-053", as: "otherSource" }] },
          ],
          hand: [{ card: CARD_ID, as: "warudamon" }],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.length === 1);

    expect(s.perm("base").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("ownSource").instanceId]);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-071"]);
    expect(s.perm("neighbor").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("otherSource").instanceId]);
    assertNoLoudGap(s);

    // Negative control: only the NEIGHBOUR holds an eligible digivolution card, so nothing is
    // linked - the clause reaches this Digimon's own stack, not any stack on the board.
    const none = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-071", as: "base" },
            { card: "BT1-071", as: "neighbor", under: [{ card: "BT24-053", as: "otherSource" }] },
          ],
          hand: [{ card: CARD_ID, as: "warudamon" }],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    none.state.memory = 4;
    await none.ready();
    expect(
      none.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: none.perm("base").permanentId,
        instanceId: none.inst("warudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => none.perm("base").topCard.cardId === CARD_ID);
    await settle(() => false, 40);
    expect(none.perm("base").linked).toHaveLength(0);
    expect(none.perm("neighbor").stack.map(({ instanceId }) => instanceId)).toEqual([
      none.inst("otherSource").instanceId,
    ]);
    assertNoLoudGap(none);
  });

  it("Q5054 + Q5056: an unsuspendable target still gains 'can't unsuspend', and the OPT is spent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "warudamon" },
            { card: "BT1-009", as: "attacker", dp: 20_000 },
          ],
          hand: [{ card: CARD_ID, as: "firstLink" }, { card: CARD_ID, as: "secondLink" }, "BT1-013"],
          deck: ["BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "protectedTarget" },
            { card: "BT1-031", as: "blocker" },
            { card: "BT1-013", as: "laterTarget" },
          ],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 8;
    await s.ready();

    // The only arming in this suite: a "can't be suspended" restriction, installed through the
    // production `restrict` primitive (the verb every Restrict clause compiles to). No printed
    // card in the fixture pool grants it, and Q5054 is exactly about that state.
    await advance(s.engine).verb.restrict(
      s.perm("protectedTarget").permanentId,
      "beSuspended",
      EffectDuration.Permanent,
    );

    // First link -> [All Turns] [Once Per Turn] fires; the chosen target cannot suspend.
    preferred.push(s.perm("protectedTarget").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("warudamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("protectedTarget"), "unsuspend"));
    expect(s.perm("protectedTarget").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("protectedTarget"), "unsuspend")).toBe(true);
    expect(s.state.memory).toBe(5);
    // Nothing suspended, so the linked copy's own link effect never fired: security untouched.
    expect(s.state.players[1]!.security).toHaveLength(2);

    // Free the single link slot the natural way: attack, let the opponent block. The blocker
    // suspends, which is an opponent Digimon suspending, so the LINKED Warudamon card's link
    // effect pays its cost by trashing itself and trashes the opponent's top security card.
    preferred.length = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("topSecurity").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("firstLink").instanceId);
    expect(s.perm("warudamon").linked).toHaveLength(0);

    // Second link in the SAME turn: the [Once Per Turn] use was spent by the first link even
    // though it suspended nothing (Q5056), so this one may not suspend or restrict anything.
    preferred.push(s.perm("laterTarget").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("warudamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warudamon").linked.length === 1);
    await settle(() => false, 40);
    expect(s.perm("laterTarget").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("laterTarget"), "unsuspend")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q5055 may refuse: no suspension means no 'can't unsuspend' either", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "warudamon" }], hand: [{ card: "BT24-053", as: "link" }, "BT1-013"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true },
    );
    // BT24-053 Protecmon's own printed link cost is 1.
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("warudamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warudamon").linked.length === 1);
    await settle(() => false, 40);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("[Once Per Turn] resets on the next own turn, and 'can't unsuspend' survives exactly one unsuspend phase", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "warudamon" }],
          hand: [{ card: CARD_ID, as: "linkA" }, { card: CARD_ID, as: "linkB" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victimA" },
            { card: "BT1-013", as: "victimB" },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: [{ card: "BT1-009", as: "aTopSecurity" }, "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 6;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Turn 1 (mine): link -> suspend victimA + "can't unsuspend". victimA suspending is an
    // opponent Digimon suspending, so linkA's own link effect trashes itself for 1 security.
    preferred.push(s.perm("victimA").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkA").instanceId,
        targetPermanentId: s.perm("warudamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victimA").isSuspended);
    expect(observe(s.engine).isRestricted(s.perm("victimA"), "unsuspend")).toBe(true);
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("aTopSecurity").instanceId);
    expect(s.perm("warudamon").linked).toHaveLength(0);

    // The opponent's unsuspend phase must leave victimA suspended.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("victimA").isSuspended).toBe(true);

    // Back on my turn the restriction has lapsed and the once-per-turn use has reset.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("victimA"), "unsuspend")).toBe(false);
    s.state.memory = 6;
    preferred.length = 0;
    preferred.push(s.perm("victimB").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkB").instanceId,
        targetPermanentId: s.perm("warudamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victimB").isSuspended);
    expect(s.perm("victimB").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victimB"), "unsuspend")).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.winnerSeat !== undefined);
    await loop;
  });

  it("links only onto an [Appmon] Digimon, for exactly 3, and contributes +4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // BT24-053 Protecmon: [Appmon]. BT1-009 Monodramon: [Mini Dragon], not [Appmon].
            { card: "BT24-053", as: "appmon" },
            { card: "BT1-009", as: "notAppmon" },
          ],
          hand: [{ card: CARD_ID, as: "warudamon" }, "BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("appmon").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("warudamon").instanceId,
        targetPermanentId: s.perm("notAppmon").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("warudamon").instanceId,
        targetPermanentId: s.perm("appmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("appmon").linked.some(({ cardId }) => cardId === CARD_ID));
    expect(s.state.memory).toBe(0);
    expect(s.perm("appmon").currentDP).toBe(baseDp + 4000);
  });

  it("Q5051 trashes itself as the link cost and takes exactly 1 security when a blocker suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-053", as: "host", linked: [{ card: CARD_ID, as: "warudamon" }] },
            { card: "BT1-009", as: "attacker", dp: 20_000 },
          ],
          hand: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-031", as: "blocker" }],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("warudamon").instanceId]);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("topSecurity").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("Q5052 pays with a different link card on the same host, and refusal keeps the security card", async () => {
    const preferred: string[] = [];
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            {
              // BT21-101 Gaiamon prints ＜Link +1＞ and the [Appmon] trait, so the host really
              // holds two link cards without any test-side grant.
              card: "BT21-101",
              as: "host",
              linked: [
                { card: CARD_ID, as: "warudamon" },
                { card: "BT26-010", as: "otherLink" },
              ],
            },
            { card: "BT1-009", as: "attacker", dp: 20_000 },
          ],
          hand: ["BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-031", as: "blocker" }],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(accepted.inst("otherLink").instanceId);
    await accepted.ready();
    expect(observe(accepted.engine).linkMaxDelta(accepted.perm("host"))).toBe(1);
    expect(
      accepted.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: accepted.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      accepted.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: accepted.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.state.players[1]!.security.length === 1);
    expect(accepted.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([
      accepted.inst("warudamon").instanceId,
    ]);
    expect(accepted.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("otherLink").instanceId,
    );
    expect(accepted.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      accepted.inst("topSecurity").instanceId,
    );

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-053", as: "host", linked: [{ card: CARD_ID, as: "warudamon" }] },
            { card: "BT1-009", as: "attacker", dp: 20_000 },
          ],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      declined.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: declined.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[1]!.battleArea.length === 0);
    await settle(() => false, 40);
    expect(declined.perm("host").linked).toHaveLength(1);
    expect(declined.state.players[1]!.security).toHaveLength(2);
  });

  it("＜Fortitude＞ replays it after a real battle deletion, only with digivolution cards", async () => {
    const withSource = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "warudamon", under: [{ card: "BT1-071", as: "source" }] }],
          hand: ["BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-031", as: "blocker", dp: 20_000 }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    await withSource.ready();
    const warudamonId = withSource.inst("warudamon").instanceId;
    const memoryBefore = withSource.state.memory;
    expect(
      withSource.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withSource.perm("warudamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => withSource.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      withSource.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: withSource.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      withSource.state.players[0]!.trash.some(({ instanceId }) => instanceId === withSource.inst("source").instanceId),
    );
    await settle(() => false, 40);
    // ＜Fortitude＞ replays the top card as a NEW permanent, so the board is read directly
    // rather than through the Board Spec alias, which still names the deleted permanent.
    const replayed = withSource.state.players[0]!.battleArea;
    expect(replayed.map(({ topCard }) => topCard.instanceId)).toEqual([warudamonId]);
    expect(replayed[0]!.stack).toHaveLength(0);
    expect(replayed[0]!.linked).toHaveLength(0);
    expect(withSource.state.memory).toBe(memoryBefore);

    const withoutSource = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "warudamon" }], hand: ["BT1-013"] },
        1: { battleArea: [{ card: "BT1-031", as: "blocker", dp: 20_000 }], security: ["BT1-009"] },
      },
      { autoDeclineOptional: true },
    );
    await withoutSource.ready();
    expect(
      withoutSource.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withoutSource.perm("warudamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => withoutSource.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      withoutSource.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: withoutSource.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => withoutSource.state.players[0]!.battleArea.length === 0);
    expect(withoutSource.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });
});
