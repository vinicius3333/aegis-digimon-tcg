import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT8-091.js";

describe("BT8-091 Willis", () => {
  it("keeps the hatch, name gate, and Security clause in executable IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "OnPlay", actions: [{ kind: "Hatch", optional: true }] },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              into: { nameOrTrait: [{ tokens: ["Gargomon", "Rapidmon"], match: "name" }] },
              cost: { kind: "suspend" },
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("may hatch a Digi-Egg into an empty breeding area", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT8-091", as: "source" }], eggDeck: [{ card: "BT8-005", as: "egg" }] },
    });
    const player = s.state.players[0]!;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const hatchDecision = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(hatchDecision.sourceCardId).toBe("BT8-091");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hatchDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.breeding?.topCard?.instanceId === s.inst("egg").instanceId);
    expect(player.eggDeck).toHaveLength(0);
  });

  it("leaves the Digi-Egg deck unchanged when the optional hatch is declined", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT8-091", as: "source" }], eggDeck: [{ card: "BT8-005", as: "egg" }] },
    });
    const player = s.state.players[0]!;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const hatchDecision = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: hatchDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-091"));

    expect(player.breeding).toBeUndefined();
    expect(player.eggDeck).toHaveLength(1);
    expect(player.eggDeck[0]?.instanceId).toBe(s.inst("egg").instanceId);
  });

  it("does not offer hatching when the Digi-Egg deck is empty", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT8-091", as: "source" }] } });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-091"));
    await settle(() => false, 40);

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not offer hatching when the breeding area is occupied", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT8-091", as: "source" }],
        eggDeck: ["BT8-005"],
        breeding: { card: "BT8-046", as: "occupant" },
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-091"));
    await settle(() => false, 40);

    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.players[0]!.breeding?.permanentId).toBe(s.perm("occupant").permanentId);
    expect(s.state.players[0]!.eggDeck).toHaveLength(1);
  });

  it("may suspend itself to reduce a Rapidmon digivolution cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-091", as: "willis" },
            { card: "BT8-046", as: "base" },
          ],
          hand: [{ card: "BT8-039", as: "rapidmon" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rapidmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("rapidmon").instanceId);
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.perm("willis").isSuspended).toBe(true);
    const reductionPrompts = s.decisions.filter(({ req }) => req.kind === "optional");
    expect(reductionPrompts).toHaveLength(1);
    expect(reductionPrompts[0]!.req.sourceCardId).toBe("BT8-091");
  });

  it("does not offer or apply the reduction when Willis is already suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-091", as: "willis", suspended: true },
          { card: "BT8-046", as: "base" },
        ],
        hand: [{ card: "BT8-039", as: "rapidmon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rapidmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-039");

    expect(s.state.memory).toBe(0);
    expect(s.perm("willis").isSuspended).toBe(true);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays itself from a face-up Security check without memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT8-091", as: "securityWillis", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityWillis"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("securityWillis").instanceId,
      ),
    ).toBe(true);
  });
});
