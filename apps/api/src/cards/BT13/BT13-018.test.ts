import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { type EngineSetup, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-018.js";
import "../BT12/BT12-092.js";
import "../BT13/BT13-095.js";
import "../BT18/BT18-059.js";
import "../BT21/BT21-096.js";
import "../ST1/ST1-03.js";

describe("BT13-018 ShineGreymon", () => {
  it("uses substring RizeGreymon evolution but exact Marcus Damon targets", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["RizeGreymon"], cost: 3, isAlternate: true },
    ]);
    expect(JSON.stringify(compiled)).not.toContain('"tokens":["Marcus Damon"],"match":"name"');
    expect(JSON.stringify(compiled)).toContain('"tokens":["Marcus Damon"],"match":"nameExact"');
    expect(compiled.effects[0]?.actions[1]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[0]?.actions[2]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[1]?.actions[1]).toMatchObject({ target: { sameTarget: true } });
    expect(compiled.effects[1]?.actions[2]).toMatchObject({ target: { sameTarget: true } });
  });

  it("at Start of Main publicly makes Marcus a 3000 DP Blocker Digimon that can attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { security: [{ card: "BT1-010", as: "weakSecurity" }], deck: ["BT1-010", "BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("marcus").currentDP === 3000);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("weakSecurity").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("when digivolving from RizeGreymon for 3 grants the same Marcus effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-015", as: "rize" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT13-018", as: "shine" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const evolutionMaterialId1 = s.perm("rize").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rize").permanentId,
        instanceId: s.inst("shine").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rize").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("rize").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.perm("marcus").currentDP === 3000);
    await settle();
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
  });

  it("affects Marcus Damon & Agumon through its name rule", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-018", as: "shine" },
          { card: "AD1-021", as: "ruleMarcus" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("shine"));

    expect(s.perm("ruleMarcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("ruleMarcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("ruleMarcus"), "digivolve")).toBe(true);
  });

  it("publicly suspending Marcus after Start of Main gives one opposing Digimon -6000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-092", as: "secondMarcus" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "target" }],
          security: [{ card: "BT1-010", as: "weakSecurity" }, "BT1-010", "BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const shineId = s.perm("shine").topCard.instanceId;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("marcus").currentDP === 3000);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.perm("shine").topCard.instanceId).toBe(shineId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(1000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(s.perm("target").currentDP).toBe(7000);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.perm("shine").topCard.instanceId).toBe(shineId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("supplemental event ignores a blue-only Tamer suspension", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-018", as: "shine" },
          { card: "BT13-097", as: "blueTamer" },
        ],
      },
      1: { battleArea: [{ card: "BT1-021", as: "target" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("blueTamer").permanentId,
    });

    expect(s.perm("target").currentDP).toBe(7000);
  });
});

describe("BT13-018 ShineGreymon — KB Q&A rulings", () => {
  async function grantMarcusDigimonStatus(s: EngineSetup, shineAlias = "shine"): Promise<void> {
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm(shineAlias));
  }

  it("lets a Marcus treated as a Digimon attack and use inherited effects, but not the turn it was played (Q2276)", async () => {
    const established = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus", under: ["ST1-03"] },
          ],
        },
        1: { security: 3 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await established.ready();
    const attackPlayer = {
      type: "attack",
      attackerPermanentId: established.perm("marcus").permanentId,
      target: { kind: "player" },
    } as const;
    expect(established.engine.applyIntent(0, attackPlayer).ok).toBe(false);
    await grantMarcusDigimonStatus(established);
    expect(established.perm("marcus").currentDP).toBe(4000);
    expect(
      established.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: established.perm("marcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    const playedThisTurn = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus", enteredThisTurn: true },
          ],
        },
        1: { security: 3 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await playedThisTurn.ready();
    await grantMarcusDigimonStatus(playedThisTurn);
    expect(playedThisTurn.perm("marcus").currentDP).toBe(3000);
    expect(
      playedThisTurn.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: playedThisTurn.perm("marcus").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("keeps a Marcus treated as a Digimon a Tamer for red or yellow Tamer suspension watchers (Q5986)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
            { card: "BT1-010", as: "redDigimon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-021", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await grantMarcusDigimonStatus(s);
    expect(s.perm("marcus").currentDP).toBe(3000);

    await advance(s.engine).verb.suspend([s.perm("redDigimon").permanentId], 0);
    await settle();
    expect(s.perm("target").currentDP).toBe(7000);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId], 0);
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it.fails("treats an effect activated by a Marcus treated as a Digimon as both a Digimon effect and a Tamer effect (Q5987)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT13-095", as: "marcus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "immuneToDigimonEffects" },
            { card: "BT1-021", as: "exposed" },
            { card: "BT18-059", as: "zenimon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.perm("immuneToDigimonEffects").topCard.instanceId, s.perm("exposed").topCard.instanceId);
    await advance(s.engine).verb.restrict(
      s.perm("immuneToDigimonEffects").permanentId,
      "beAffected",
      EffectDuration.UntilOpponentTurnEnd,
      { fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true },
    );
    await grantMarcusDigimonStatus(s);
    expect(s.perm("marcus").currentDP).toBe(3000);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId], 0);
    await settle(() => s.state.memory === 4);

    expect(s.state.memory).toBe(4);
    expect(s.perm("immuneToDigimonEffects").currentDP).toBe(7000);
  });

  it.fails("deletes a Marcus treated as a 3000 DP Digimon when an effect drops its DP to 0 (Q5988)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-095", as: "suspendingMarcus" }] },
        1: {
          battleArea: [
            { card: "BT13-018", as: "opponentShine" },
            { card: "BT12-092", as: "digimonMarcus" },
            { card: "BT12-092", as: "plainMarcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    const digimonMarcusCardId = s.perm("digimonMarcus").topCard.instanceId;
    preferInstanceIds.push(digimonMarcusCardId);
    s.state.turnSeat = 1;
    await grantMarcusDigimonStatus(s, "opponentShine");
    s.state.turnSeat = 0;
    expect(s.perm("digimonMarcus").currentDP).toBe(3000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspendingMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === digimonMarcusCardId));

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(digimonMarcusCardId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("plainMarcus").permanentId,
    );
  });

  it("overwrites the DP of a Marcus already treated as a Digimon with a newer effect while keeping its Blocker and adding Rush (Q5989)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "championOption" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await grantMarcusDigimonStatus(s);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("championOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").currentDP === 12000);

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);

    const lowerNewer = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
          hand: [{ card: "BT21-096", as: "championOption" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    lowerNewer.state.memory = 10;
    await lowerNewer.ready();
    expect(
      lowerNewer.engine.applyIntent(0, { type: "playCard", instanceId: lowerNewer.inst("championOption").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => lowerNewer.perm("marcus").currentDP === 12000);
    expect(lowerNewer.perm("marcus").currentDP).toBe(12000);

    await grantMarcusDigimonStatus(lowerNewer);
    expect(lowerNewer.perm("marcus").currentDP).toBe(3000);
    expect(observe(lowerNewer.engine).hasKeyword(lowerNewer.perm("marcus"), "Rush")).toBe(true);
    expect(observe(lowerNewer.engine).hasKeyword(lowerNewer.perm("marcus"), "Blocker")).toBe(true);
  });

  it("lets a Marcus treated as a Digimon gain memory through a Tamer-effects-only memory lock (Q5990)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-018", as: "shine" },
            { card: "BT13-095", as: "marcus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "target" },
            { card: "BT18-059", as: "zenimon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.perm("target").topCard.instanceId);
    await grantMarcusDigimonStatus(s);
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId], 0);
    await settle(() => s.state.memory === 4);

    expect(s.state.memory).toBe(4);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("zenimon").permanentId,
    );
  });

  it.fails("keeps an opponent Digimon unaffected by Digimon effects immune to the effect of a Marcus treated as a Digimon (Q5991)", async () => {
    async function suspendMarcusTargetingImmuneDigimon(treatMarcusAsDigimon: boolean): Promise<number> {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT13-018", as: "shine" },
              { card: "BT13-095", as: "marcus" },
            ],
          },
          1: {
            battleArea: [
              { card: "BT1-021", as: "immuneToDigimonEffects" },
              { card: "BT1-021", as: "exposed" },
            ],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      await s.ready();
      preferInstanceIds.push(s.perm("immuneToDigimonEffects").topCard.instanceId);
      await advance(s.engine).verb.restrict(
        s.perm("immuneToDigimonEffects").permanentId,
        "beAffected",
        EffectDuration.UntilOpponentTurnEnd,
        { fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true },
      );
      if (treatMarcusAsDigimon) await grantMarcusDigimonStatus(s);
      expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(treatMarcusAsDigimon);

      await advance(s.engine).verb.suspend([s.perm("marcus").permanentId], 0);
      await settle();
      expect(s.perm("exposed").currentDP).toBe(7000);
      return s.perm("immuneToDigimonEffects").currentDP;
    }

    expect(await suspendMarcusTargetingImmuneDigimon(false)).toBe(4000);
    expect(await suspendMarcusTargetingImmuneDigimon(true)).toBe(7000);
  });
});
