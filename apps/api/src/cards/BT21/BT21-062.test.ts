import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT21-062.js";
import "./BT21-098.js";
import "../index.js";

const GALACTICMON = "BT21-062";
const PLAIN_DIGIMON = "BT1-009";
const module = getEffectModule(GALACTICMON)!;

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("BT21-062 [Start of Your Main Phase] delete 1 opponent Digimon", () => {
  it("registers all three printed timings and the Snatchmon evolution route", () => {
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnStartMainPhase, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, {} as never)).toHaveLength(0);
    expect(module.cardId).toBe(GALACTICMON);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Snatchmon"], cost: 9, isAlternate: true }]);
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      filter: {
        controller: "mine",
        kind: ["Option"],
        playCostLte: 99,
        nameOrTrait: [{ tokens: ["Ragnarok Cannon"], match: "nameExact" }],
      },
      from: ["hand", "trash"],
      payCost: false,
      allowCostWithoutTarget: true,
    });
    expect(compiled.coverage).toBe("full");
  });

  it("deletes one of the opponent's Digimon on start of main phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GALACTICMON, dp: 12000 }] },
        1: { battleArea: [{ card: PLAIN_DIGIMON, dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1];
    s.state.turnSeat = 0;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 400 && p1?.battleArea.length !== 0; i++) await Promise.resolve();

    expect(p1?.battleArea.length).toBe(0);
    expect(p1?.trash.length).toBeGreaterThanOrEqual(1);
  });

  it("publicly deletes an opposing Digimon at the real start of its Main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON, as: "galacticmon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: PLAIN_DIGIMON, as: "victim" }],
          deck: ["BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === PLAIN_DIGIMON)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does NOT delete when it is the opponent's turn ([Your Turn] gate)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GALACTICMON, dp: 12000 }] },
        1: { battleArea: [{ card: PLAIN_DIGIMON, dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const p1 = s.state.players[1];

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    expect(p1?.battleArea.length).toBe(1);
  });

  it("places exactly 4 Vemmon-text cards and uses Ragnarok Cannon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON, as: "galacticmon" }],
          hand: [{ card: "BT21-098", as: "cannon" }],
          trash: [
            { card: "BT21-056", as: "vemmon1" },
            { card: "BT21-056", as: "vemmon2" },
            { card: "BT11-065", as: "vemmonText1" },
            { card: "BT11-065", as: "vemmonText2" },
          ],
        },
        1: { battleArea: [{ card: PLAIN_DIGIMON, as: "cannonTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await fireTiming(s, EffectTiming.WhenDigivolving, {
      subjectPermanentId: s.perm("galacticmon").permanentId,
    });
    for (let i = 0; i < 400 && s.perm("galacticmon").stack.length < 4; i++) await Promise.resolve();

    expect(s.perm("galacticmon").stack).toHaveLength(4);
    expect(s.state.players[0]?.hand.some((card) => card.instanceId === s.inst("cannon").instanceId)).toBe(false);
    expect(s.state.players[1]?.battleArea.length).toBeLessThanOrEqual(1);
  });

  it("pays the four-card Vemmon-text placement cost even with no legal Ragnarok target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON, as: "galacticmon" }],
          hand: [{ card: "BT21-098", as: "cannon" }],
          trash: ["BT21-056", "BT21-056", "BT11-065", "BT11-065"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galacticmon"));
    await settle(() => s.perm("galacticmon").stack.length === 4);
    expect(s.perm("galacticmon").stack).toHaveLength(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cannon").instanceId)).toBe(false);
  });

  it.each([true, false])(
    "publicly evolves without any Ragnarok Cannon and may pay the four-card cost: %s",
    async (accept) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-058", as: "host", under: ["BT21-006", "BT21-056"] }],
            hand: [{ card: GALACTICMON, as: "evolution" }],
            deck: ["BT1-001"],
            trash: ["BT21-056", "BT21-056", "BT11-065", "BT11-065"],
          },
        },
        { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evolution").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(GALACTICMON);
      expect(s.state.memory).toBe(2);
      expect(s.perm("host").stack).toHaveLength(accept ? 7 : 3);
      expect(s.state.players[0]!.trash).toHaveLength(accept ? 0 : 4);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
    },
  );

  it("publicly pays all four Vemmon sources before declining an eligible Ragnarok Cannon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-058", as: "snatchmon" }],
          hand: [
            { card: GALACTICMON, as: "evolution" },
            { card: "BT21-098", as: "cannon" },
          ],
          trash: ["BT21-056", "BT21-056", "BT11-065", "BT11-065"],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      {},
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("snatchmon").permanentId,
        instanceId: s.inst("evolution").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const cost = s.state.pendingDecision!;
    expect(cost.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("snatchmon").stack.length === 5);
    expect(s.perm("snatchmon").stack).toHaveLength(5);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const option = s.decisions.at(-1)!.req;
    if (option.kind !== "selectCards") throw new Error("expected optional Ragnarok Cannon selection");
    expect(option.options?.min).toBe(0);
    expect(option.options?.candidateInstanceIds).toContain(s.inst("cannon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: option.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("snatchmon").topCard.cardId).toBe(GALACTICMON);
    expect(s.perm("snatchmon").stack).toHaveLength(5);
    expect(s.perm("snatchmon").stack.filter((card) => card.cardId === "BT21-056")).toHaveLength(2);
    expect(s.perm("snatchmon").stack.filter((card) => card.cardId === "BT11-065")).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cannon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("returns exactly 4 stacked Vemmon to deck bottom to prevent leaving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GALACTICMON,
              as: "galacticmon",
              under: [
                { card: "BT21-056", as: "vemmon1" },
                { card: "BT21-056", as: "vemmon2" },
                { card: "BT21-056", as: "vemmon3" },
                { card: "BT21-056", as: "vemmon4" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("galacticmon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]?.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(true);
    expect(s.state.players[0]?.deck.slice(-4).every((card) => card.cardId === "BT21-056")).toBe(true);
  });

  it("publicly builds the legal Snatchmon stack, then protects against an opponent Option deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-058", as: "snatchmon" }],
          hand: [{ card: GALACTICMON, as: "galacticmon" }],
          trash: ["BT21-056", "BT21-056", "BT21-056", "BT21-056"],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT2-055", as: "blackSource" }],
          hand: [{ card: "BT21-098", as: "cannon" }],
          deck: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("snatchmon").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("snatchmon").topCard.cardId === GALACTICMON && s.perm("snatchmon").stack.length === 5);
    expect(s.perm("snatchmon").stack).toHaveLength(5);
    expect(s.state.memory).toBe(1);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("snatchmon").stack.length === 1 &&
        s.state.players[0]!.deck.slice(-4).every((card) => card.cardId === "BT21-056"),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("snatchmon").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.perm("snatchmon").stack).toHaveLength(1);
    expect(s.state.players[0]!.deck.slice(-4).every((card) => card.cardId === "BT21-056")).toBe(true);
  });

  it("does not treat Snatchmon text as exact Vemmon names for leave prevention", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-058", as: "snatchmon" }],
          hand: [{ card: GALACTICMON, as: "galacticmon" }],
          trash: ["BT11-065", "BT11-065", "BT11-065", "BT11-065"],
        },
        1: { battleArea: [{ card: "BT2-055", as: "blackSource" }], hand: [{ card: "BT21-098", as: "cannon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("snatchmon").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("snatchmon").topCard.cardId === GALACTICMON && s.perm("snatchmon").stack.length === 5);
    expect(s.perm("snatchmon").stack).toHaveLength(5);
    expect(s.state.memory).toBe(1);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("cannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === GALACTICMON)).toBe(true);
  });

  it("Q4570 cannot partially place only three Vemmon-text cards to use Ragnarok Cannon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON, as: "galacticmon" }],
          hand: [{ card: "BT21-098", as: "cannon" }],
          trash: ["BT21-056", "BT21-056", "BT11-065"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galacticmon"));

    expect(s.perm("galacticmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cannon").instanceId)).toBe(true);
  });

  it("Q4571 cannot prevent leaving with only three stacked Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GALACTICMON,
              as: "galacticmon",
              under: ["BT21-056", "BT21-056", "BT21-056"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("galacticmon").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("alternate-digivolves from Snatchmon for 9", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-058", as: "snatchmon" }],
        hand: [{ card: GALACTICMON, as: "galacticmon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("snatchmon").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    for (let i = 0; i < 400 && s.perm("snatchmon").topCard.instanceId !== s.inst("galacticmon").instanceId; i++) {
      await Promise.resolve();
    }

    expect(s.state.memory).toBe(1);
  });
});

describe("BT21-062 Galacticmon — KB Q&A rulings", () => {
  it("accepts cards with [Vemmon] in their name, effects, or inherited effects as the four placed digivolution cards (Q4569)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-058", as: "snatchmon" }],
          hand: [{ card: GALACTICMON, as: "galacticmon" }],
          trash: [
            { card: "BT21-056", as: "vemmonInName" },
            { card: "BT11-065", as: "vemmonInEffect" },
            { card: "BT21-006", as: "vemmonInInheritedEffect" },
            { card: "BT18-092", as: "vemmonInTamerEffect" },
            { card: PLAIN_DIGIMON, as: "noVemmon" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.inst("noVemmon").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("snatchmon").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("snatchmon").stack.length === 5 && s.state.pendingDecision === undefined);

    const stackIds = s.perm("snatchmon").stack.map((card) => card.instanceId);
    for (const alias of ["vemmonInName", "vemmonInEffect", "vemmonInInheritedEffect", "vemmonInTamerEffect"]) {
      expect(stackIds).toContain(s.inst(alias).instanceId);
    }
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("noVemmon").instanceId]);
  });

  it("lets P-244 <Delay> digivolve the Galacticmon into EX11-046 after its When Digivolving placement adds Vemmon (Q6932)", async () => {
    async function digivolveIntoGalacticmonBeside(trash: string[]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-058", as: "host" },
              { card: "P-244", as: "emblem" },
            ],
            hand: [
              { card: GALACTICMON, as: "galacticmon" },
              { card: "EX11-046", as: "assemblyGalacticmon" },
            ],
            trash,
            deck: ["BT1-001", "BT1-002", "BT1-003"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("galacticmon").instanceId,
          alternateRequirementIndex: 0,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.perm("host").topCard.cardId !== "BT21-058");
      await settle();
      return s;
    }

    // BT21-056 Vemmon's inherited effect reduces the Delay digivolution by 1, so it costs 5 - 3 - 1.
    const delayed = await digivolveIntoGalacticmonBeside(["BT21-056", "BT11-065", "BT11-065", "BT11-065"]);
    expect(delayed.perm("host").topCard.instanceId).toBe(delayed.inst("assemblyGalacticmon").instanceId);
    expect(delayed.perm("host").stack.map((card) => card.instanceId)).toContain(delayed.inst("galacticmon").instanceId);
    expect(delayed.state.players[0]!.trash.map((card) => card.instanceId)).toContain(delayed.inst("emblem").instanceId);
    expect(delayed.state.memory).toBe(10 - 9 - (5 - 3 - 1));

    const noVemmonPlaced = await digivolveIntoGalacticmonBeside(["BT11-065", "BT11-065", "BT11-065", "BT11-065"]);
    expect(noVemmonPlaced.perm("host").stack.filter((card) => card.cardId === "BT11-065")).toHaveLength(4);
    expect(noVemmonPlaced.perm("host").topCard.instanceId).toBe(noVemmonPlaced.inst("galacticmon").instanceId);
    expect(noVemmonPlaced.perm("emblem").topCard.cardId).toBe("P-244");
    expect(noVemmonPlaced.state.memory).toBe(1);
  });
});
