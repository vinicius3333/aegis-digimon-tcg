import { compiledEffects, EffectTiming, getCardDefinition } from "@aegis/shared";
import { afterEach, describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { syntheticDefinitions } from "../../engine/testkit/syntheticDefinitions.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";
import { registeredCompiledCards, registeredIrModules } from "../../engine/effects/interpreter/compiledCards.js";
import { unregisterCard } from "../../engine/effects/registry.js";
import "./BT2-088.js";
import "../index.js";

const ORIGIN_OPTION = "TEST-TAIGA-EVOLUTION-ORIGIN";
afterEach(() => {
  unregisterCard(ORIGIN_OPTION);
  registeredCompiledCards.delete(ORIGIN_OPTION);
  registeredIrModules.delete(ORIGIN_OPTION);
  delete compiledEffects[ORIGIN_OPTION];
  syntheticDefinitions.delete(ORIGIN_OPTION);
});

describe("BT2-088 Taiga", () => {
  it.each(["hand", "trash"] as const)(
    "#4938 sweep preserves Taiga's hand-only scope for paid effect evolution from %s",
    async (origin) => {
      // No current printed effect evolves a Tyrannomon from trash. This test-only IR
      // Option exercises that shared payment seam without changing any real card.
      syntheticDefinitions.set(ORIGIN_OPTION, {
        ...getCardDefinition("BT1-110")!,
        cardId: ORIGIN_OPTION,
        nameEn: "Paid effect evolution",
        playCost: 0,
      });
      registerIrCard(ORIGIN_OPTION, {
        coverage: "full",
        residual: [],
        effects: [
          {
            trigger: "Main",
            actions: [
              {
                kind: "Digivolve",
                target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                into: { controller: "mine", kind: ["Digimon"], cardId: "BT2-044" },
                from: [origin],
                payCost: true,
              },
            ],
          },
        ],
      });
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT2-088", as: "taiga" },
              { card: "BT2-043", as: "base" },
            ],
            hand: [
              { card: ORIGIN_OPTION, as: "option" },
              { card: "BT2-044", as: "handCopy" },
            ],
            trash: origin === "trash" ? [{ card: "BT2-044", as: "trashCopy" }] : [],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      const handCopyId = s.inst("handCopy").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("base").topCard.cardId === "BT2-044" && s.state.pendingDecision === undefined);
      expect(s.perm("taiga").isSuspended).toBe(origin === "hand");
      expect(s.state.memory).toBe(origin === "hand" ? 2 : 1);
      expect(s.decisions.filter((d) => d.req.sourceCardId === "BT2-088" && d.req.kind === "optional")).toHaveLength(
        origin === "hand" ? 1 : 0,
      );
      expect(s.state.players[0]!.hand.some((c) => c.instanceId === handCopyId)).toBe(origin === "trash");
    },
  );
  it("grants Piercing and may suspend to reduce a Tyrannomon digivolution cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-088", as: "taiga" },
            { card: "BT2-043", as: "base" },
          ],
          hand: [{ card: "BT2-044", as: "tyrannomon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-044" && s.perm("taiga").isSuspended);
    await advance(s.engine).recompute();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });

  it("grants Piercing only to the controller's Tyrannomon-named Digimon during its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-088", as: "taiga" },
          { card: "BT2-044", as: "tyrannomon" },
          { card: "BT2-045", as: "argomon" },
        ],
      },
      1: { battleArea: [{ card: "BT2-044", as: "opposingTyrannomon" }] },
    });
    await s.ready();

    expect(observe(s.engine).hasPierce(s.perm("tyrannomon"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("argomon"))).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("opposingTyrannomon"))).toBe(false);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasPierce(s.perm("tyrannomon"))).toBe(false);
  });

  it("#4938 mechanism sweep: may decline the Tyrannomon cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-088", as: "taiga" },
            { card: "BT2-043", as: "base" },
          ],
          hand: [{ card: "BT2-044", as: "tyrannomon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-044");

    expect(s.state.memory).toBe(0);
    expect(s.perm("taiga").isSuspended).toBe(false);
  });

  it("does not reduce digivolution into a non-Tyrannomon card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-088", as: "taiga" },
            { card: "BT2-043", as: "base" },
          ],
          hand: [{ card: "BT1-072", as: "woodmon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("woodmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-072");

    expect(s.state.memory).toBe(0);
    expect(s.perm("taiga").isSuspended).toBe(false);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT2-088", as: "securityTamer", faceUp: true }] } });
    const instanceId = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  });

  it("Q1038 does not reduce a Tyrannomon digivolution in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-088", as: "taiga" }],
          breeding: { card: "BT2-043", as: "base" },
          hand: [{ card: "BT2-044", as: "tyrannomon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-044");

    expect(s.state.memory).toBe(0);
    expect(s.perm("taiga").isSuspended).toBe(false);
  });
});
