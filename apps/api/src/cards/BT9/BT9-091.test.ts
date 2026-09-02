import { EffectTiming, getCardDefinition, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-074.js";
import { compiled } from "./BT9-091.js";
import "./BT9-091.js";

describe("BT9-091 Meiko Mochizuki", () => {
  it("matches catalog values and the optional reveal, exact-color, and security IR", () => {
    expect(getCardDefinition("BT9-091")).toMatchObject({
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              optional: true,
              add: [{ filter: { kind: ["Digimon"], colors: ["Yellow", "Purple"] } }],
              rest: "trash",
            },
          ],
        },
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: { multicolor: true, and: [{ colors: ["Purple"] }, { colors: ["Yellow"] }] },
              actions: [{ kind: "GainMemory", amount: 1, optional: true, cost: { kind: "suspend" } }],
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("adds Meicoomon and trashes the other revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-091", as: "meiko" }],
          deck: [{ card: "BT9-074", as: "meicoomon" }, "BT9-071", "BT9-072"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meiko").instanceId })).toEqual({ ok: true });
    await settle(
      () => player.hand.some((card) => card.instanceId === s.inst("meicoomon").instanceId) && player.trash.length === 2,
    );

    expect(player.trash).toHaveLength(2);
    expect(player.deck).toHaveLength(0);
  });

  it("suspends to gain 1 memory when Meicoomon is played from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-091", as: "meiko" }],
          security: [{ card: "BT9-074", as: "meicoomon" }],
        },
        1: { battleArea: [{ card: "BT14-031", as: "attacker", dp: 500 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("meiko").isSuspended && s.state.memory === -1);

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("meicoomon").instanceId,
      ),
    ).toBe(true);
  });

  it("asks separately before suspending each Meiko when Meicoomon is played from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-091", as: "firstMeiko" },
            { card: "BT9-091", as: "secondMeiko" },
          ],
          security: [{ card: "BT9-074", as: "meicoomon" }],
        },
        1: { battleArea: [{ card: "BT14-031", as: "attacker", dp: 500 }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    for (let index = 0; index < 2; index += 1) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const pending = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    }
    await settle(() => s.perm("firstMeiko").isSuspended && s.perm("secondMeiko").isSuspended);

    expect(s.perm("firstMeiko").isSuspended).toBe(true);
    expect(s.perm("secondMeiko").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-2);
  });

  it("offers each of 2 Meikos exactly once for one two-color Digimon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-091", as: "firstMeiko" },
            { card: "BT9-091", as: "secondMeiko" },
          ],
          hand: [{ card: "BT9-074", as: "meicoomon" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("meicoomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstMeiko").isSuspended && s.perm("secondMeiko").isSuspended);
    await s.ready();

    const meikoPrompts = s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT9-091");
    expect(meikoPrompts).toHaveLength(2);
    expect(new Set(meikoPrompts.map(({ req }) => req.decisionId))).toHaveLength(2);
  });

  it("does not trigger for a purple and red 2-color Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-091", as: "meiko" }],
          hand: [{ card: "BT10-012", as: "wrongColors" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wrongColors").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("wrongColors").instanceId,
      ),
    );

    expect(s.perm("meiko").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("Security plays Meiko without paying its cost", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT9-091", as: "meiko", faceUp: true }] } },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("meiko"));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("meiko").instanceId),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
