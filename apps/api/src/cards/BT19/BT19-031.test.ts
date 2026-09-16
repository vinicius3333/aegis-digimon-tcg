import { digivolutionRequirementsFor, EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT19-031.js";

describe("BT19-031 Starmons", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-031")).toMatchObject({
      cardId: "BT19-031",
      nameEn: "Starmons",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Major", "Xros Heart"],
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      effectText:
        "[Digivolve]Lv.2 w/[Xros Heart] trait: Cost 0 \n\n＜Decoy ([Xros Heart] trait)＞ (When your other [Xros Heart] trait Digimon would be deleted by an opponent's effect, you may delete this Digimon to prevent 1 of those Digimon's deletion)\n[On Deletion] You may play 1 [ShootingStarmon] from under your Tamers without paying the cost. Then, place 1 [Starmons] and 1 [Pickmons] from your trash as that Digimon's bottom digivolution cards.",
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] If this Digimon has the [Xros Heart] trait, 1 of your opponent's Digimon gets -2000 DP for the turn.",
    });
  });

  it("compiles all four printed clauses and nothing else", () => {
    expect(digivolutionRequirementsFor("BT19-031")).toContainEqual({
      level: 2,
      traits: ["Xros Heart"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Decoy", raw: "＜Decoy ([Xros Heart] trait)＞" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          abortOnDecline: true,
          payCost: false,
          from: ["digivolutionCardsUnderTamers"],
          bindResultAs: "playedShootingStarmon",
          target: {
            count: 1,
            filter: {
              controller: "mine",
              zone: "digivolutionCardsUnderTamers",
              nameOrTrait: [{ tokens: ["ShootingStarmon"], match: "nameExact" }],
            },
          },
        },
        {
          kind: "PlaceUnder",
          position: "bottom",
          target: {
            count: 1,
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Starmons"], match: "nameExact" }],
            },
          },
          underFilter: { controller: "mine", boundRef: "playedShootingStarmon" },
        },
        {
          kind: "PlaceUnder",
          position: "bottom",
          target: {
            count: 1,
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ tokens: ["Pickmons"], match: "nameExact" }],
            },
          },
          underFilter: { controller: "mine", boundRef: "playedShootingStarmon" },
        },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          condition: { kind: "selfHasTrait" },
        },
      ],
    });
    expect(compiled.effects).toHaveLength(3);
    expect(compiled.coverage).toBe("full");
  });

  it("hatches a [Xros Heart] Digi-Egg and digivolves on the free alternate route", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT19-001", as: "egg" }],
          hand: [{ card: "BT19-031", as: "stars" }],
          deck: ["BT1-010", "BT1-011", "BT1-009", "BT1-013", "BT1-014"],
          security: ["BT1-011", "BT1-010"],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
          security: ["BT1-011", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-001");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("stars").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-031");

    const raised = s.state.players[0]!.breeding!;
    expect(raised.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    expect(raised.currentDP).toBe(1000);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT19-031")).toBe(false);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("falls back to the printed Red Lv.2 route for 1 when the egg lacks [Xros Heart]", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "egg" },
          hand: [{ card: "BT19-031", as: "stars" }],
          deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011"],
          security: ["BT1-011", "BT1-010"],
        },
        1: { security: ["BT1-011", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const eggInstanceId = s.perm("egg").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("stars").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT19-031");

    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an illegal Blue Lv.2 source even with the alternate cost requested", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "egg" },
        hand: [{ card: "BT19-031", as: "stars" }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-011", "BT1-010"],
      },
      1: { security: ["BT1-011", "BT1-010"] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("stars").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);

    expect(s.state.players[0]!.breeding!.topCard?.cardId).toBe("BT1-003");
    expect(s.state.players[0]!.breeding!.stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-031"]);
  });

  it("has Decoy on the battle area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-031", as: "stars" }], security: ["BT1-013", "BT1-014"] },
      1: { security: ["BT1-013", "BT1-014"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("stars"), "Decoy")).toBe(true);
  });

  it("deletes itself to save an [Xros Heart] peer, but not a peer without the trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "decoy" },
            { card: "BT19-033", as: "xrosPeer" },
            { card: "BT19-030", as: "traitNearMiss" },
          ],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const decoyInstanceId = s.perm("decoy").topCard!.instanceId;
    const xrosPeerId = s.perm("xrosPeer").permanentId;
    const nearMissId = s.perm("traitNearMiss").permanentId;

    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([xrosPeerId], "byEffect");
    driver.verb.leaveEffectResolution();
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([xrosPeerId, nearMissId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([decoyInstanceId]);
  });

  it("will not spend itself for a peer without the [Xros Heart] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "decoy" },
            { card: "BT19-030", as: "traitNearMiss" },
          ],
          security: ["BT1-011", "BT1-010"],
        },
        1: { security: ["BT1-011", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const decoyId = s.perm("decoy").permanentId;
    const nearMissInstanceId = s.perm("traitNearMiss").topCard!.instanceId;

    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(1, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("traitNearMiss").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([decoyId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([nearMissInstanceId]);
  });

  it("never fires for the controller's own effect or for a battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "decoy" },
            { card: "BT19-033", as: "xrosPeer" },
          ],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const decoyId = s.perm("decoy").permanentId;
    const xrosPeerId = s.perm("xrosPeer").permanentId;

    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(0, ["Digimon"]);
    await driver.verb.deletePermanent([xrosPeerId], "byEffect");
    driver.verb.leaveEffectResolution();
    await settle(() => false, 30);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([decoyId]);

    s.putOnBoard(0, { card: "BT19-033", as: "secondPeer" });
    await advance(s.engine).recompute();
    const secondPeerId = s.perm("secondPeer").permanentId;
    await advance(s.engine).verb.deletePermanent([secondPeerId], "byBattle");
    await settle(() => false, 30);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([decoyId]);
  });

  it("plays only the ShootingStarmon under YOUR Tamer and places both named trash cards at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "stars" },
            {
              card: "BT19-083",
              as: "tamer",
              under: [
                { card: "BT10-034", as: "underNameNearMiss" },
                { card: "BT19-035", as: "shooting" },
              ],
            },
          ],
          trash: [
            { card: "BT19-035", as: "trashNameNearMiss" },
            { card: "BT10-003", as: "pickmons" },
          ],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT19-083", as: "opponentTamer", under: [{ card: "BT19-035", as: "opponentShooting" }] },
          ],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const starsInstanceId = s.perm("stars").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("stars").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-035"));
    await settle(() => false, 30);

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-035")!;
    expect(played.topCard!.instanceId).toBe(s.inst("shooting").instanceId);
    expect(played.stack.map((card) => card.instanceId)).toEqual([s.inst("pickmons").instanceId, starsInstanceId]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("underNameNearMiss").instanceId]);
    expect(s.perm("opponentTamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("opponentShooting").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("trashNameNearMiss").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places whichever of [Starmons] / [Pickmons] the trash actually holds (Q3088)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "stars" },
            { card: "BT19-083", as: "tamer", under: [{ card: "BT19-035", as: "shooting" }] },
          ],
          trash: [{ card: "BT19-033", as: "irrelevant" }],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const starsInstanceId = s.perm("stars").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("stars").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-035"));
    await settle(() => false, 30);

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-035")!;
    expect(played.stack.map((card) => card.instanceId)).toEqual([starsInstanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("irrelevant").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places a distinct trash [Starmons] rather than only the deleted copy", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "stars" },
            { card: "BT19-083", as: "tamer", under: [{ card: "BT19-035", as: "shooting" }] },
          ],
          trash: [
            { card: "BT10-029", as: "trashStarmons" },
            { card: "BT10-003", as: "pickmons" },
          ],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    await s.ready();
    prefer.push(s.inst("trashStarmons").instanceId);
    const starsInstanceId = s.perm("stars").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("stars").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-035"));
    await settle(() => false, 30);

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-035")!;
    expect(played.stack).toHaveLength(2);
    expect(played.stack[0]!.instanceId).toBe(s.inst("pickmons").instanceId);
    expect([...prefer, starsInstanceId]).toContain(played.stack[1]!.instanceId);
    expect(getCardDefinition(played.stack[1]!.cardId)?.nameEn).toBe("Starmons");
  });

  it("declining the optional play aborts the placements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "stars" },
            { card: "BT19-083", as: "tamer", under: [{ card: "BT19-035", as: "shooting" }] },
          ],
          trash: [{ card: "BT10-003", as: "pickmons" }],
          security: ["BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-013", "BT1-014"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const starsInstanceId = s.perm("stars").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("stars").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === starsInstanceId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-083"]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("shooting").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("pickmons").instanceId,
      starsInstanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does nothing when the only ShootingStarmon is under the OPPONENT's Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-031", as: "stars" },
            { card: "BT19-083", as: "tamer", under: [{ card: "BT10-034", as: "underNameNearMiss" }] },
          ],
          trash: [{ card: "BT10-003", as: "pickmons" }],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT19-083", as: "opponentTamer", under: [{ card: "BT19-035", as: "opponentShooting" }] },
          ],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const starsInstanceId = s.perm("stars").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("stars").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === starsInstanceId));
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT19-083"]);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("underNameNearMiss").instanceId]);
    expect(s.perm("opponentTamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("opponentShooting").instanceId,
    ]);
  });

  it("reduces one opposing Digimon by 2000 on a real attack from a real evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-031", as: "stars" }],
          hand: [{ card: "BT19-033", as: "doru" }, "BT1-013"],
          deck: [{ card: "BT1-010", as: "evoDraw" }, "BT1-011", "BT1-009", "BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-050", as: "first" },
            { card: "BT1-047", as: "second" },
          ],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
          security: ["BT1-011", "BT1-010", "BT1-011", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const starsInstanceId = s.perm("stars").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stars").permanentId,
        instanceId: s.inst("doru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evoDraw").instanceId));
    expect(s.perm("stars").topCard?.cardId).toBe("BT19-033");
    expect(s.perm("stars").stack.map((card) => card.instanceId)).toEqual([starsInstanceId]);
    expect(s.state.memory).toBe(2);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(3000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("stars").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").currentDP === 2000 || s.perm("second").currentDP === 1000);
    await settle(() => false, 30);

    const reduced = [s.perm("first"), s.perm("second")].filter(
      (permanent) => permanent.currentDP === permanent.baseDP - 2000,
    );
    expect(reduced).toHaveLength(1);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("stars"));
    expect(
      [s.perm("first"), s.perm("second")].filter((permanent) => permanent.currentDP === permanent.baseDP - 2000),
    ).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(3000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("stars").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").currentDP === 2000 || s.perm("second").currentDP === 1000);
    await settle(() => false, 30);
    expect(
      [s.perm("first"), s.perm("second")].filter((permanent) => permanent.currentDP === permanent.baseDP - 2000),
    ).toHaveLength(1);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does nothing under a host without the [Xros Heart] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-037", as: "traitNearMiss", under: [{ card: "BT19-031", as: "source" }] }],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-050", as: "target" }],
          hand: ["BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-013", "BT1-014"],
          security: ["BT1-011", "BT1-010", "BT1-011", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(getCardDefinition("BT19-037")?.types).not.toContain("Xros Heart");

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("traitNearMiss").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3);
    await settle(() => false, 30);

    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.perm("traitNearMiss").stack.map((card) => card.instanceId)).toEqual([s.inst("source").instanceId]);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
