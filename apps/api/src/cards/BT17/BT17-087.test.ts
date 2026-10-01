import { describe, expect, it } from "vitest";
import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter/matching/definition.js";
import { compiled } from "./BT17-087.js";
import "./index.js";
import "../BT11/BT11-088.js";
import "../BT12/BT12-038.js";
import "../BT12/BT12-083.js";
import "../BT13/BT13-008.js";
import "../BT13/BT13-095.js";
import "../BT14/BT14-069.js";
import "../BT18/BT18-009.js";
import "../BT18/BT18-059.js";
import "../BT21/BT21-096.js";
import "../EX5/EX5-074.js";
import "../EX10/EX10-056.js";
import "../EX10/EX10-059.js";
import "../EX8/EX8-030.js";
import "../ST3/ST3-14.js";

describe("BT17-087 Marcus Damon", () => {
  it("matches the immutable catalog identity and preserves full IR coverage", () => {
    expect(getCardDefinition("BT17-087")).toMatchObject({
      nameEn: "Marcus Damon",
      colors: ["Yellow", "Red"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("turns one selected Marcus Damon into a temporary 3000-DP Blocker that cannot digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "SelectBind",
          target: {
            bindAs: "marcusTarget",
            filter: { nameOrTrait: [{ tokens: ["Marcus Damon"], match: "nameExact" }] },
          },
        },
        {
          kind: "GrantStatic",
          target: { filter: {}, count: 1, fromSelectionRef: "marcusTarget" },
          grant: "kinds",
          tokens: ["Digimon"],
        },
        { kind: "SetBaseDP", target: { filter: {}, count: 1, fromSelectionRef: "marcusTarget" }, value: 3000 },
        {
          kind: "Restrict",
          target: { filter: {}, count: 1, fromSelectionRef: "marcusTarget" },
          restriction: "digivolve",
        },
        {
          kind: "GainKeyword",
          target: { filter: {}, count: 1, fromSelectionRef: "marcusTarget" },
          keyword: { keyword: "Blocker" },
        },
      ],
    });
  });

  it("resolves both All Turns effects only when this Tamer suspends", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" },
        { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } },
      ],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("plays Marcus Damon from Security when checked", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT17-087", as: "marcus" }],
      },
      1: { battleArea: [{ card: "AD1-001", dp: 12000, as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const marcusId = s.inst("marcus").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === marcusId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === marcusId)).toBe(false);
  });

  it("naturally applies all temporary On Play grants to the chosen Marcus", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-087", as: "played" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("played"), "Blocker"));

    expect(s.perm("played").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("played"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("played"), "digivolve")).toBe(true);
  });

  it("naturally reacts only when this Marcus becomes suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-087", as: "marcus" },
          { card: "BT17-052", as: "agumon" },
          { card: "BT1-087", as: "otherTamer" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("otherTamer").permanentId]);
    expect(s.state.memory).toBe(0);
    expect(s.perm("agumon").currentDP).toBe(1000);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    expect(s.perm("agumon").currentDP).toBe(4000);
  });

  it("selects [Marcus Damon] by exact name, including a combined card through its name rule", () => {
    const exactRef = { tokens: ["Marcus Damon"], match: "nameExact" as const };

    expect(matchNameOrTrait(getCardDefinition("BT17-087")!, exactRef)).toBe(true);
    expect(matchNameOrTrait(getCardDefinition("ST24-13")!, exactRef)).toBe(true);

    expect(matchNameOrTrait(getCardDefinition("AD1-021")!, exactRef)).toBe(true);
    expect(matchNameOrTrait(getCardDefinition("AD1-021")!, { tokens: ["Marcus Damon"], match: "name" })).toBe(true);
  });

  it("adds DP but no memory when no [Agumon]/[Greymon] Digimon is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-087", as: "marcus" },
          { card: "BT1-012", as: "biyomon" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.perm("biyomon").currentDP === 5000);

    expect(s.perm("biyomon").currentDP).toBe(5000);
    expect(s.state.memory).toBe(0);
  });
});

describe("BT17-087 Marcus Damon — KB Q&A rulings", () => {
  type Setup = ReturnType<typeof setupEngine>;
  const FILLER = ["BT1-009", "BT1-009", "BT1-009"];

  function boardWithOpposingMarcus(placerSeat: SeatSpec, markerSeat: SeatSpec, preferred: string[]): Setup {
    return setupEngine(
      {
        0: { deck: [...FILLER], security: ["BT1-009", "BT1-009"], ...placerSeat },
        1: {
          deck: [...FILLER],
          security: ["BT1-009", "BT1-009"],
          ...markerSeat,
          hand: [{ card: "BT17-087", as: "marcus" }, ...(markerSeat.hand ?? [])],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
  }

  async function playOpposingMarcusAsDigimon(s: Setup): Promise<void> {
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    s.state.turnSeat = 0;
  }

  async function expectGeoGreymonInheritedOnlyWhileMarcusIsDigimon(
    s: Setup,
    geoInstanceId: string,
    placer: string,
  ): Promise<void> {
    const marcusId = s.perm("marcus").permanentId;
    expect(s.perm("marcus").stack[0]?.instanceId).toBe(geoInstanceId);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(true);

    s.state.turnSeat = 1;
    const dpBeforeSuspend = s.perm(placer).currentDP;
    await advance(s.engine).verb.suspend([marcusId]);
    await settle(() => s.perm(placer).currentDP === dpBeforeSuspend - 2000);
    expect(s.perm(placer).currentDP).toBe(dpBeforeSuspend - 2000);

    await advance(s.engine).verb.unsuspend([marcusId]);
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(false);
    expect(s.perm("marcus").stack[0]?.instanceId).toBe(geoInstanceId);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("marcus"), "BT12-038")).toBe(false);

    const dpAfterDigimonStatusEnds = s.perm(placer).currentDP;
    await advance(s.engine).verb.suspend([marcusId]);
    await drainMicrotasks();
    expect(s.perm("marcus").isSuspended).toBe(true);
    expect(s.perm(placer).currentDP).toBe(dpAfterDigimonStatusEnds);
  }

  it("a Digimon-treated Marcus gains the inherited effect of a GeoGreymon that BT11-088 places under it, and loses it once it stops being a Digimon (Q2114)", async () => {
    const preferred: string[] = [];
    const s = boardWithOpposingMarcus(
      { hand: [{ card: "BT11-088", as: "bagramon" }] },
      { battleArea: [{ card: "BT12-038", as: "geo" }] },
      preferred,
    );
    await playOpposingMarcusAsDigimon(s);
    const geoInstanceId = s.perm("geo").topCard.instanceId;
    preferred.push(geoInstanceId, s.perm("geo").permanentId);

    s.state.memory = 14;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoInstanceId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("marcus").permanentId,
    ]);

    await expectGeoGreymonInheritedOnlyWhileMarcusIsDigimon(s, geoInstanceId, "bagramon");
  });

  it("a Tamer also treated as a Digimon can attack and gains inherited effects, but cannot attack on the turn it was played (Q2870)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-087", as: "oldMarcus", under: ["BT12-038"] }],
          hand: [{ card: "BT17-087", as: "newMarcus" }],
          deck: [...FILLER],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentDigimon" }],
          security: ["BT1-009", "BT1-009"],
          deck: [...FILLER],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 4;
    await s.ready();
    preferred.push(s.perm("oldMarcus").topCard.instanceId);

    expect(observe(s.engine).canUseInheritedEffect(s.perm("oldMarcus"), "BT12-038")).toBe(false);
    const tamerAttack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("oldMarcus").permanentId,
      target: { kind: "player" },
    });
    expect(tamerAttack.ok).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("newMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("oldMarcus"), "Blocker"));
    expect(s.perm("oldMarcus").currentDP).toBe(3000);
    expect(observe(s.engine).canUseInheritedEffect(s.perm("oldMarcus"), "BT12-038")).toBe(true);

    const freshMarcus = setupEngine(
      {
        0: { hand: [{ card: "BT17-087", as: "marcus" }], deck: [...FILLER] },
        1: { security: ["BT1-009", "BT1-009"], deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    freshMarcus.state.memory = 4;
    await freshMarcus.ready();
    expect(
      freshMarcus.engine.applyIntent(0, { type: "playCard", instanceId: freshMarcus.inst("marcus").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => observe(freshMarcus.engine).hasKeyword(freshMarcus.perm("marcus"), "Blocker"));
    expect(freshMarcus.perm("marcus").currentDP).toBe(3000);
    const sameTurnAttack = freshMarcus.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: freshMarcus.perm("marcus").permanentId,
      target: { kind: "player" },
    });
    expect(sameTurnAttack.ok).toBe(false);
    expect(freshMarcus.perm("marcus").isSuspended).toBe(false);

    const securityBefore = s.state.players[1]!.security.length;
    expect(s.perm("opponentDigimon").currentDP).toBe(3000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oldMarcus").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("oldMarcus").isSuspended).toBe(true);
    await settle(() => s.perm("opponentDigimon").currentDP === 1000);
    expect(s.perm("opponentDigimon").currentDP).toBe(1000);
    await advance(s.engine).finishAttack();
    expect(s.state.players[1]!.security.length).toBe(securityBefore - 1);
  });

  async function suspendDigimonTreatedMarcusUnderMemoryLock(lockCardId: string): Promise<Setup> {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-087", as: "marcus" }],
          battleArea: [
            { card: "BT17-052", as: "agumon" },
            { card: "BT1-012", as: "gazimonHost", under: ["BT14-069"] },
          ],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: lockCardId, as: "lock" }], deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    expect(advance(s.engine).ledgers.continuous.grantedKinds(s.perm("marcus").permanentId)).toContain("Digimon");
    expect(s.state.memory).toBe(0);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("gazimonHost").permanentId], "byEffect")).toBe(1);
    await drainMicrotasks();
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.state.memory === 1);
    return s;
  }

  it("a Digimon-treated Marcus still gains memory on suspend under BT18-009's Tamer-effects-only memory lock, while a Digimon effect is blocked (Q2911)", async () => {
    const s = await suspendDigimonTreatedMarcusUnderMemoryLock("BT18-009");
    expect(s.state.memory).toBe(1);
    expect(s.perm("agumon").currentDP).toBe(4000);
  });

  it("a Digimon-treated Marcus still gains memory on suspend under BT18-059's Tamer-effects-only memory lock, while a Digimon effect is blocked (Q2991)", async () => {
    const s = await suspendDigimonTreatedMarcusUnderMemoryLock("BT18-059");
    expect(s.state.memory).toBe(1);
    expect(s.perm("agumon").currentDP).toBe(4000);
  });

  it("a Digimon-treated Marcus gains the inherited effect of a GeoGreymon that BT12-083 moves from the battle area under it, and loses it once it stops being a Digimon (Q4997)", async () => {
    const preferred: string[] = [];
    const s = boardWithOpposingMarcus(
      {
        battleArea: [
          { card: "BT12-011", as: "arrester" },
          { card: "BT12-087", as: "ownTamer" },
        ],
        hand: [{ card: "BT12-083", as: "arresterCard" }],
      },
      { battleArea: [{ card: "BT12-038", as: "geo" }] },
      preferred,
    );
    await playOpposingMarcusAsDigimon(s);
    const geoInstanceId = s.perm("geo").topCard.instanceId;
    preferred.push(geoInstanceId, s.perm("geo").permanentId);

    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("arrester").permanentId,
        instanceId: s.inst("arresterCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoInstanceId));
    expect(s.perm("arrester").topCard.cardId).toBe("BT12-083");
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("marcus").permanentId,
    ]);

    await expectGeoGreymonInheritedOnlyWhileMarcusIsDigimon(s, geoInstanceId, "arrester");
  });

  it("a Digimon-treated Marcus gains the inherited effect of a GeoGreymon that EX10-056 moves from the battle area under it, and loses it once it stops being a Digimon (Q5147)", async () => {
    const preferred: string[] = [];
    const s = boardWithOpposingMarcus(
      { hand: [{ card: "EX10-056", as: "bagramon" }] },
      { battleArea: [{ card: "BT12-038", as: "geo" }] },
      preferred,
    );
    await playOpposingMarcusAsDigimon(s);
    const geoInstanceId = s.perm("geo").topCard.instanceId;
    preferred.push(geoInstanceId, s.perm("geo").permanentId);

    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoInstanceId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("marcus").permanentId,
    ]);

    await expectGeoGreymonInheritedOnlyWhileMarcusIsDigimon(s, geoInstanceId, "bagramon");
  });

  it("a Digimon-treated Marcus gains the inherited effect of a GeoGreymon that EX10-059 places under it from the hand, and loses it once it stops being a Digimon (Q5165)", async () => {
    const s = boardWithOpposingMarcus(
      { hand: [{ card: "EX10-059", as: "bagramon" }] },
      { hand: [{ card: "BT12-038", as: "geo" }] },
      [],
    );
    await playOpposingMarcusAsDigimon(s);
    const geoInstanceId = s.inst("geo").instanceId;
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toEqual([geoInstanceId]);

    s.state.memory = 16;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bagramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").stack.some(({ instanceId }) => instanceId === geoInstanceId));
    expect(s.state.players[1]!.hand.length).toBe(0);

    await expectGeoGreymonInheritedOnlyWhileMarcusIsDigimon(s, geoInstanceId, "bagramon");
  });

  it("a Marcus also treated as a Digimon is still a Tamer: Tamer-suspension watchers fire and Digimon targeting can choose it (Q6007)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-087", as: "marcus" }],
          battleArea: [{ card: "BT1-012", as: "biyomon", under: ["BT13-008"] }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    preferred.push(s.perm("marcus").topCard.instanceId, s.perm("marcus").permanentId);

    const grantedKinds = advance(s.engine).ledgers.continuous.grantedKinds(s.perm("marcus").permanentId);
    expect(grantedKinds).toContain("Digimon");
    expect(getCardDefinition(s.perm("marcus").topCard.cardId)?.kinds).toEqual(["Tamer"]);
    expect(s.perm("marcus").currentDP).toBe(3000);
    const opponentDigimonId = s.perm("opponentDigimon").permanentId;

    s.state.memory = 0;
    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.perm("marcus").currentDP === 6000);
    await settle(() => s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== opponentDigimonId));

    expect(s.perm("marcus").currentDP).toBe(6000);
    expect(s.perm("biyomon").currentDP).toBe(2000);
    expect(s.state.players[1]!.battleArea.length).toBe(0);
  });

  it("an effect activated by a Digimon-treated Marcus counts as both a Tamer effect and a Digimon effect (Q6008)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-087", as: "marcus" }],
          battleArea: [{ card: "BT17-052", as: "agumon" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "BT18-059", as: "lock" }], deck: [...FILLER] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("marcus").permanentId]);
    await settle(() => s.perm("agumon").currentDP === 4000);
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
    const boost = advance(s.engine)
      .ledgers.modifiers.dpModifiersOf(s.perm("agumon").permanentId)
      .find(({ delta }) => delta === 3000);
    expect(boost?.sourceKinds).toEqual(expect.arrayContaining(["Tamer", "Digimon"]));
  });

  it("a Digimon-treated Marcus whose DP becomes 0 is deleted at the rule check (Q6009)", async () => {
    const s = boardWithOpposingMarcus(
      {
        battleArea: [{ card: "ST3-07", as: "yellowSource" }],
        hand: [
          { card: "ST3-14", as: "firstCharm" },
          { card: "ST3-14", as: "secondCharm" },
        ],
      },
      {},
      [],
    );
    await playOpposingMarcusAsDigimon(s);
    const marcusId = s.perm("marcus").permanentId;
    const marcusInstanceId = s.perm("marcus").topCard.instanceId;
    expect(s.perm("marcus").currentDP).toBe(3000);

    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstCharm").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("marcus").currentDP === 1000);
    await drainMicrotasks();
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === marcusId)).toBe(true);

    await advance(s.engine).verb.modifyDP(marcusId, 1000, EffectDuration.UntilEachTurnEnd);
    expect(s.perm("marcus").currentDP).toBe(2000);
    const secondCharmId = s.inst("secondCharm").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondCharmId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === secondCharmId));
    await drainMicrotasks();

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === marcusId)).toBe(false);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === marcusInstanceId)).toBe(true);
  });

  it("a newer 'treated as a Digimon with X000 DP' effect overwrites the DP while added keywords stack (Q6010)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-087", as: "marcus" },
            { card: "BT21-096", as: "option" },
          ],
          battleArea: [{ card: "BT13-008", as: "agumon" }],
          deck: [...FILLER],
        },
        1: { deck: [...FILLER] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("marcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker"));
    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("marcus"), "Rush"));

    expect(s.perm("marcus").currentDP).toBe(12000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("marcus"), "digivolve")).toBe(true);
    expect(s.state.memory).toBe(2);

    // The newest grant wins even when its DP is lower, so this is not a "highest DP" rule.
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("agumon").topCard.instanceId,
        effectKey: "BT13-008/become-digimon",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("marcus").currentDP === 3000);

    expect(s.perm("marcus").currentDP).toBe(3000);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("marcus"), "Rush")).toBe(true);
  });

  it("a Tamer treated as a Digimon still gains memory with its effect under EX8-030's Tamer-effects-only memory lock (Q6011)", async () => {
    const s = await suspendDigimonTreatedMarcusUnderMemoryLock("EX8-030");
    expect(s.state.memory).toBe(1);
    expect(s.perm("agumon").currentDP).toBe(4000);
  });

  async function boardWithSuspendDebuffTamerAgainstFanglongmon(): Promise<{ s: Setup; preferred: string[] }> {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-095", as: "debuffMarcus" }],
          hand: [{ card: "BT17-087", as: "grantingMarcus" }],
          deck: [...FILLER],
        },
        1: { battleArea: [{ card: "EX5-074", as: "fanglongmon" }], deck: [...FILLER] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.perm("fanglongmon").currentDP).toBe(15000);
    return { s, preferred };
  }

  async function suspendDebuffMarcus(s: Setup): Promise<void> {
    await advance(s.engine).verb.suspend([s.perm("debuffMarcus").permanentId]);
    await settle(() => s.perm("debuffMarcus").isSuspended);
    await drainMicrotasks();
  }

  it("an opponent's Digimon that isn't affected by Digimon effects ignores the effect of a Tamer treated as a Digimon (Q6012)", async () => {
    // Near-miss: while BT13-095 is only a Tamer, its -3000 DP effect is a pure Tamer effect and reaches EX5-074.
    const { s: tamerOnly } = await boardWithSuspendDebuffTamerAgainstFanglongmon();
    await suspendDebuffMarcus(tamerOnly);
    await settle(() => tamerOnly.perm("fanglongmon").currentDP === 12000);
    expect(tamerOnly.perm("fanglongmon").currentDP).toBe(12000);

    const { s, preferred } = await boardWithSuspendDebuffTamerAgainstFanglongmon();
    preferred.push(s.perm("debuffMarcus").topCard.instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grantingMarcus").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("debuffMarcus"), "Blocker"));
    expect(s.perm("debuffMarcus").currentDP).toBe(3000);

    await suspendDebuffMarcus(s);
    expect(s.perm("fanglongmon").currentDP).toBe(15000);
  });
});
