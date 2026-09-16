import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT19-075.js";

const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

function opponentHand(count: number): { card: string; as: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    card: index % 2 === 0 ? "BT1-009" : "BT1-013",
    as: `oh${index}`,
  }));
}

describe("BT19-075 MoonMillenniummon", () => {
  it("matches the catalog print", () => {
    expect(getCardDefinition("BT19-075")).toMatchObject({
      cardId: "BT19-075",
      nameEn: "MoonMillenniummon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Wicked God"],
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 5 }],
    });
    const printed = getCardDefinition("BT19-075")!.effectText!;
    expect(printed).toContain("[Digivolve][Millenniummon]: Cost 2");
    expect(printed).toContain(
      "[On Play] [When Digivolving] Your opponent trashes cards in their hand until they have 5 left. For every 2 cards trashed by this effect, delete 1 of your opponent's Tamers.",
    );
    expect(printed).toContain(
      "[All Turns] When this Digimon would leave the battle area, by deleting 1 of your Digimon with the [Composite]\u00A0trait Digimon, it doesn't leave.",
    );
    expect(printed).toContain(
      "[All Turns] [Once Per Turn] When other Digimon or Tamers are deleted, trash your opponent's top security card.",
    );
    expect(getCardDefinition("BT19-075")!.types).not.toContain("Composite");
  });

  it("compiles the opponent-chosen discard, the self-only replacement and the once-per-turn watcher", () => {
    const compiled = runtimeCompiledCard("BT19-075");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Trash",
            chooser: "opponent",
            trackCount: "trashedThisEffect",
            target: { filter: { zone: "hand", controller: "opponent" }, untilHandSize: 5 },
          },
          {
            kind: "Delete",
            target: { count: 1, filter: { controller: "opponent", kind: ["Tamer"] } },
            scaling: { per: 2, unit: "namedCount", countSource: "trashedThisEffect" },
          },
        ],
      })),
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            sourceFilter: { isSelfRef: true },
            actions: [
              {
                kind: "Prevent",
                mode: "leavePlay",
                optional: true,
                cost: {
                  kind: "deleteOwn",
                  target: {
                    count: 1,
                    filter: {
                      controller: "mine",
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["Composite"], match: "trait" }],
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "onDeletionOf",
            raw: "[All Turns] [Once Per Turn] When other Digimon or Tamers are deleted, trash your opponent's top security card.",
            effectTextPart:
              "[All Turns] [Once Per Turn] When other Digimon or Tamers are deleted, trash your opponent's top security card.",
            sourceFilter: { excludeSelf: true, kind: ["Digimon", "Tamer"] },
            actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
          },
        ],
      },
    ]);
    expect(compiled?.digivolutionRequirement).toEqual([{ namesExact: ["Millenniummon"], cost: 2, isAlternate: true }]);
  });

  it("Q3135: the opponent chooses two cards down to five, and two trashed cards delete one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "ownTamer" }],
          hand: [
            { card: "BT19-075", as: "moon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          hand: opponentHand(7),
          battleArea: [
            { card: "BT1-087", as: "tamer1" },
            { card: "BT1-087", as: "tamer2" },
            { card: "BT1-009", as: "opponentDigimon" },
          ],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 16;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("moon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 5);
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(1);
    const handSelection = s.decisions.find((entry) => entry.req.kind === "selectCards" && entry.seat === 1);
    expect(handSelection).toBeDefined();
    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT1-087")).toHaveLength(
      1,
    );
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.perm("opponentDigimon").topCard!.instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT1-087",
      "BT19-075",
    ]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Once Per Turn]: four trashed cards delete two Tamers but still trash only one security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-075", as: "moon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          hand: opponentHand(9),
          battleArea: [
            { card: "BT1-087", as: "tamer1" },
            { card: "BT1-087", as: "tamer2" },
            { card: "BT1-087", as: "tamer3" },
          ],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 16;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("moon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("offers MoonMillenniummon's simultaneous Tamer deletions as one OPT watcher with its own printed clause", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-075", as: "moon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          hand: opponentHand(9),
          battleArea: [
            { card: "BT1-087", as: "tamer1" },
            { card: "BT1-087", as: "tamer2" },
            { card: "BT1-087", as: "tamer3" },
          ],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 16;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("moon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    const moonOrderingRequests = s.decisions.filter(
      ({ req }) =>
        req.kind === "orderTriggers" && req.options?.triggerCardIds?.every((cardId) => cardId === "BT19-075"),
    );
    expect(moonOrderingRequests).toHaveLength(0);

    const watcher = s.events.find(
      (event) =>
        event.kind === "effectTriggered" && event.sourceCardId === "BT19-075" && event.timing === "onDeletionOf",
    );
    expect(watcher).toMatchObject({
      description:
        "[All Turns] [Once Per Turn] When other Digimon or Tamers are deleted, trash your opponent's top security card.",
      printedTiming: "AllTurns",
    });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("one trashed card deletes no Tamer, and a hand already at five is not touched at all", async () => {
    for (const handSize of [6, 5]) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT19-075", as: "moon" },
              { card: "BT1-013", as: "spare" },
            ],
            deck: DECK,
            security: SECURITY,
          },
          1: {
            hand: opponentHand(handSize),
            battleArea: [{ card: "BT1-087", as: "tamer1" }],
            deck: DECK,
            security: [
              { card: "BT1-009", as: "sec1" },
              { card: "BT1-013", as: "sec2" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 16;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("moon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.length === 1);
      await settleAcrossTimers(() => s.state.pendingDecision === undefined);

      expect(s.state.players[1]!.hand).toHaveLength(5);
      expect(s.state.players[1]!.trash).toHaveLength(handSize - 5);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
        s.perm("tamer1").topCard!.instanceId,
      ]);
      expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
        s.inst("sec1").instanceId,
        s.inst("sec2").instanceId,
      ]);
      expect(s.state.pendingDecision).toBeUndefined();

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  it("[Digivolve][Millenniummon] costs 2 on a real stack and fires [When Digivolving]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-019", as: "millenniummon", under: ["BT2-067", "BT2-075"] }],
          hand: [{ card: "BT19-075", as: "moon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: {
          hand: opponentHand(7),
          battleArea: [{ card: "BT1-087", as: "tamer1" }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const baseId = s.inst("millenniummon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("millenniummon").permanentId,
        instanceId: s.inst("moon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 5);
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(8);
    expect(s.perm("millenniummon").topCard?.cardId).toBe("BT19-075");
    expect(s.perm("millenniummon").stack.map((card) => card.cardId)).toEqual(["BT2-067", "BT2-075", "BT18-019"]);
    expect(s.perm("millenniummon").stack.at(-1)!.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);
  });

  it("near miss: ZeedMillenniummon only CONTAINS 'Millenniummon', so no route accepts it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-101", as: "zeed" }],
          hand: [{ card: "BT19-075", as: "moon" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("zeed").permanentId,
          instanceId: s.inst("moon").instanceId,
          useAlternateCost,
        }).ok,
      ).toBe(false);
    }

    expect(s.perm("zeed").topCard?.cardId).toBe("BT19-101");
    expect(s.perm("zeed").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("moon").instanceId]);
  });

  it("falls back to the printed Purple Lv.6 EvoCost of 5 for a Lv.6 base that is not [Millenniummon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "boltmon" }],
          hand: [{ card: "BT19-075", as: "moon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("boltmon").permanentId,
        instanceId: s.inst("moon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boltmon").topCard?.cardId === "BT19-075");
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
  });

  it("refuses an illegal source: a Purple Lv.3 matches neither the EvoCost nor the named route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "demidevimon" }],
          hand: [{ card: "BT19-075", as: "moon" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("demidevimon").permanentId,
          instanceId: s.inst("moon").instanceId,
          useAlternateCost,
        }).ok,
      ).toBe(false);
    }
    expect(s.perm("demidevimon").topCard?.cardId).toBe("BT2-067");
    expect(s.state.memory).toBe(10);
  });

  it("survives a lost battle by deleting a [Composite] Digimon, never the non-[Composite] peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-075", as: "moon" },
            { card: "BT6-012", as: "composite" },
            { card: "BT1-009", as: "plain" },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("moon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId).sort()).toEqual(
      [s.perm("moon").topCard!.instanceId, s.perm("plain").topCard!.instanceId].sort(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("composite").instanceId]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the replacement lets it leave, and its OWN deletion trashes no security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-075", as: "moon" },
            { card: "BT6-012", as: "composite" },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("moon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-075"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("composite").topCard!.instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec1").instanceId,
      s.inst("sec2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["an opponent's Digimon dying in battle", 1_000, 0],
    ["the controller's OWN Digimon dying in battle", 20_000, 1],
  ])("trashes the opponent's top security when %s", async (_label, wallDp, opponentSurvivors) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-075", as: "moon" },
            { card: "BT1-013", as: "attacker", dp: 5_000 },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: wallDp, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(opponentSurvivors);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("sec1").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("BT19-075");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
