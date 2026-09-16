import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-007.js";

const INERT_DECK = ["BT1-009", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-013"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX10-007 Greymon", () => {
  it("matches every catalog field and compiles every printed clause", () => {
    expect(getCardDefinition("EX10-007")).toMatchObject({
      cardId: "EX10-007",
      nameEn: "Greymon",
      colors: ["Red", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dinosaur"],
    });

    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, names: ["Agumon"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)?.actions).toEqual([
        {
          kind: "ModifyDP",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          target: { filter: { kind: ["Digimon"] }, count: 1 },
        },
      ]);
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")?.keywords).toEqual([
      { keyword: "Raid", raw: "＜Raid＞" },
    ]);
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("Q5012: On Play from hand gives an opposing Digimon +3000 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "ally" }],
          hand: [{ card: "EX10-007", as: "greymon" }],
          deck: INERT_DECK,
        },
        1: { battleArea: [{ card: "BT1-013", as: "target" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("target").topCard!.instanceId);
    s.state.memory = 4;
    const greymonId = s.inst("greymon").instanceId;
    const targetBase = s.perm("target").currentDP;
    const allyBase = s.perm("ally").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: greymonId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === targetBase + 3000 && s.state.pendingDecision === undefined);

    expect(s.perm("target").currentDP).toBe(targetBase + 3000);
    expect(s.perm("ally").currentDP).toBe(allyBase);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === greymonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("On Play can instead buff one of your own Digimon and leaves the other side untouched", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "ally" }],
          hand: [{ card: "EX10-007", as: "greymon" }],
          deck: INERT_DECK,
        },
        1: { battleArea: [{ card: "BT1-013", as: "enemy" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").topCard!.instanceId);
    s.state.memory = 4;
    const allyBase = s.perm("ally").currentDP;
    const enemyBase = s.perm("enemy").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === allyBase + 3000 && s.state.pendingDecision === undefined);

    expect(s.perm("ally").currentDP).toBe(allyBase + 3000);
    expect(s.perm("enemy").currentDP).toBe(enemyBase);
  });

  it("the +3000 DP lasts through the whole of the opponent's turn and expires when it ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "ally" }],
          hand: [{ card: "EX10-007", as: "greymon" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY, hand: ["BT1-013"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").topCard!.instanceId);
    const allyBase = s.perm("ally").currentDP;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === allyBase + 3000);
    expect(s.perm("ally").currentDP).toBe(allyBase + 3000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("ally").currentDP).toBe(allyBase + 3000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });

    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("ally").currentDP).toBe(allyBase);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["an exactly named Agumon", "EX10-006"],
    ["a ToyAgumon, proving the name gate is a substring", "BT7-007"],
  ])("digivolves for 2 from %s and buffs the chosen ally When Digivolving", async (_label, sourceCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: sourceCard, as: "source" },
            { card: "BT1-013", as: "ally" },
          ],
          hand: [{ card: "EX10-007", as: "greymon" }],
          deck: [{ card: "BT1-014", as: "drawn" }, ...INERT_DECK],
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").topCard!.instanceId);
    s.state.memory = 2;
    const sourceId = s.inst("source").instanceId;
    const greymonId = s.inst("greymon").instanceId;
    const allyBase = s.perm("ally").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: greymonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === greymonId && s.state.pendingDecision === undefined);

    expect(s.perm("source").topCard?.instanceId).toBe(greymonId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.perm("ally").currentDP).toBe(allyBase + 3000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the Agumon alternate route from a level 3 source without [Agumon] in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "monodramon" }],
        hand: [{ card: "EX10-007", as: "greymon" }],
        deck: INERT_DECK,
      },
    });
    await s.ready();
    s.state.memory = 5;
    const greymonId = s.inst("greymon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monodramon").permanentId,
        instanceId: greymonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([greymonId]);
  });

  it("Q5013: settles both BlackWarGreymon ACEs at 15000 DP and keeps them there after expiry", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-010", as: "mine" }],
          hand: [{ card: "EX10-007", as: "greymon" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "EX10-010", as: "theirs" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
          hand: ["BT1-013"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("theirs").topCard!.instanceId);
    expect(s.perm("mine").currentDP).toBe(12_000);
    expect(s.perm("theirs").currentDP).toBe(12_000);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("theirs").currentDP === 15_000 && s.perm("mine").currentDP === 15_000);

    expect(s.perm("theirs").currentDP).toBe(15_000);
    expect(s.perm("mine").currentDP).toBe(15_000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("theirs").currentDP).toBe(15_000);
    expect(s.perm("mine").currentDP).toBe(15_000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("exposes Raid on itself only and gives an evolved host exactly +1000 inherited DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-008", as: "host", under: ["EX10-007"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(false);
    expect(getCardDefinition("EX10-008")?.dp).toBe(7000);
    expect(s.perm("host").baseDP).toBe(7000);
    expect(s.perm("host").currentDP).toBe(8000);

    const standalone = setupEngine({ 0: { battleArea: [{ card: "EX10-007", as: "greymon" }] } });
    await standalone.ready();
    expect(observe(standalone.engine).hasKeyword(standalone.perm("greymon"), "Raid")).toBe(true);
    expect(standalone.perm("greymon").currentDP).toBe(4000);
  });
});
