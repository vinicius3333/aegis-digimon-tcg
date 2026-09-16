import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState, type Seat } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-048.js";
import "./index.js";
import "./BT17-018.js";
import "./BT17-051.js";

const ARGOMON_LV5 = "BT17-048";

const ARGOMON_LV6 = "BT17-051";

describe("BT17-048 Argomon — [On Deletion] play Lv.6 Argomon (KB Q2800)", () => {
  it("matches the catalog identity and all three printed evolution/effect routes", async () => {
    expect(getCardDefinition("BT17-048")).toMatchObject({
      cardId: "BT17-048",
      colors: ["Green", "Purple"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 5 },
        { color: "Purple", level: 4, memoryCost: 5 },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Argomon"], level: 4, cost: 4, isAlternate: true },
    ]);
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          cost: { kind: "suspend", target: { filter: { kind: ["Tamer"] }, count: 5, upTo: true } },
        },
      ],
    });
  });

  it("reduces its own digivolution cost once per suspended Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-045", as: "base" },
            { card: "BT1-087", as: "firstTamer" },
            { card: "BT12-092", as: "secondTamer" },
          ],
          hand: [{ card: ARGOMON_LV5, as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === ARGOMON_LV5);

    expect(s.state.memory).toBe(0);
    expect(s.perm("firstTamer").isSuspended).toBe(true);
    expect(s.perm("secondTamer").isSuspended).toBe(true);
  });

  it("honors the alternate cost-4 route only from an exact [Argomon] base (namesExact)", async () => {
    const evolve = async (base: string, expectedMemory: number) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: ARGOMON_LV5, as: "evolving" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === ARGOMON_LV5);
      expect(s.state.memory).toBe(expectedMemory);
    };

    await evolve("BT17-045", 4);
    await evolve("BT17-046", 3);
  });

  it("prevents all opposing Tamers from unsuspending during the opponent's turn", async () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" },
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
    });
  });

  it("keeps opposing Tamers suspended through the opponent's unsuspend phase, but not their Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: ARGOMON_LV5, as: "argomon" }] },
        1: {
          battleArea: [
            { card: "BT1-087", suspended: true, as: "oppTamer" },
            { card: "BT1-009", suspended: true, as: "oppDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("oppTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(false);

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);

    expect(s.perm("oppTamer").isSuspended).toBe(true);
    expect(unsuspendedIds).not.toContain(s.perm("oppTamer").permanentId);
    expect(s.perm("oppDigimon").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("oppDigimon").permanentId);
  });

  it("with 3 Argomon in trash before deletion, the deleted card counts → 4 total, condition met", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [ARGOMON_LV5, ARGOMON_LV5, ARGOMON_LV5],
          hand: [{ card: ARGOMON_LV6, as: "lv6Argomon" }],
          battleArea: [{ card: ARGOMON_LV5, dp: 3000, as: "argomon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 1000, as: "oppBase" }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    expect(p0.trash).toHaveLength(3);

    const argomonPermId = s.perm("argomon").permanentId;
    const lv6ArgomonId = s.inst("lv6Argomon").instanceId;
    const oppBasePermId = s.perm("oppBase").permanentId;
    const growlmonId = s.inst("growlmon").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 5;

    const res = s.engine.applyIntent(1, {
      type: "digivolve",
      instanceId: growlmonId,
      permanentId: oppBasePermId,
    });
    expect(res.ok).toBe(true);

    await settle(() => {
      const argomonInField = p0.battleArea.some((perm) => perm.permanentId === argomonPermId);
      return !argomonInField;
    }, 600);

    await settle(() => {
      const lv6InField = p0.battleArea.some((perm) => perm.topCard?.cardId === ARGOMON_LV6);
      const lv6InHand = p0.hand.some((c) => c.instanceId === lv6ArgomonId);
      return lv6InField || !lv6InHand;
    }, 600);

    const lv6IsOnField = p0.battleArea.some((perm) => perm.topCard?.cardId === ARGOMON_LV6);
    expect(lv6IsOnField).toBe(true);
  });

  it("cancels an inherited Argomon On Deletion when BT17-051 places that source first (Q2808)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ARGOMON_LV5, dp: 7000, under: ["BT17-042"], as: "argomon" }],
          trash: ["BT2-042", "BT2-045"],
          hand: [{ card: ARGOMON_LV6, as: "lv6Argomon" }],
        },
        1: {
          battleArea: [{ card: "ST7-09", as: "base" }],
          hand: [{ card: "BT17-018", as: "deletionEffect" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["BT17-048", "BT17-051"] },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletionEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === ARGOMON_LV6));

    const p0 = s.state.players[0]!;
    expect(p0.battleArea.filter((p) => p.topCard?.cardId === ARGOMON_LV6)).toHaveLength(1);
    expect(s.perm("lv6Argomon").stack).toHaveLength(4);
    expect(s.perm("lv6Argomon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-048", "BT17-042", "BT2-042", "BT2-045"]),
    );
    expect(s.state.memory).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("naturally unsuspends its host after attacking by suspending Rhythm", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-051", dp: 12000, under: [{ card: ARGOMON_LV5 }], as: "host" },
            { card: "BT17-089", as: "rhythm" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rhythm").isSuspended);

    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("Q2799 suspends an opposing Tamer for the digivolution-cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-045", as: "base" }],
          hand: [{ card: ARGOMON_LV5, as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-087", as: "oppTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === ARGOMON_LV5);

    expect(s.perm("oppTamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("inherited unsuspend is once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-051", dp: 12000, under: [{ card: ARGOMON_LV5 }], as: "host" },
            { card: "BT17-089", as: "rhythmA" },
            { card: "BT17-089", as: "rhythmB" },
          ],
          hand: [{ card: "BT1-009" }, { card: "BT1-009" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000, as: "oppBody" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    const suspendedRhythms = () => [s.perm("rhythmA"), s.perm("rhythmB")].filter((perm) => perm.isSuspended).length;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });

    const turn1 = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(attack()).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && suspendedRhythms() === 1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(suspendedRhythms()).toBe(1);

    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(suspendedRhythms()).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn1;

    const passTurn = () => {
      s.state.turnSeat = (1 - s.state.turnSeat) as Seat;
      s.state.memory = -s.state.memory;
    };

    passTurn();
    await advance(s.engine).runTurn(1);

    passTurn();
    const turn3 = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);

    expect(attack()).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && suspendedRhythms() >= 1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(suspendedRhythms()).toBeGreaterThanOrEqual(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn3;
  });
});
