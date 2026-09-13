import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-043.js";
import "./index.js";

describe("BT22-043 Terriermon", () => {
  it("watches self CS digivolution-card additions before playing a CS Tamer", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: {
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
            count: 1,
          },
          condition: {
            kind: "permanentCount",
            filter: { controller: "mine", kind: ["Tamer"] },
            op: "lte",
            value: 1,
          },
        },
      ],
    });
  });

  it("keeps the inherited top-to-bottom placement draw effect", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      cost: {
        kind: "place",
        target: {
          filter: { isSelfRef: true, controllerDefault: "mine", kind: ["Digimon"] },
          count: 1,
          isSelf: true,
        },
      },
    });
  });

  it("does not trigger for a CS Tamer placed under the stack", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT22-091", as: "tamer" }],
        battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-043"] }],
      },
    });
    await s.ready();
    const initialMemory = s.state.memory;

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);
    await settle();

    expect(s.state.memory).toBe(initialMemory);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(false);
  });

  it("implements Q4895 by exposing Terriermon, playing a CS Tamer, and drawing", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009"],
          hand: [{ card: "BT22-091", as: "arata" }],
          battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-044", "BT22-043"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const terriermon = host.stack.find((card) => card.cardId === "BT22-043")!;
    const source = (s.engine as any).cardSourceOf(terriermon);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-043/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: terriermon.instanceId, effectKey }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT22-043");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(host.topCard?.cardId).toBe("BT22-043");
    expect(host.stack.map((card) => card.cardId)).toEqual(["BT22-046", "BT22-044"]);
  });

  it("does not play a CS Tamer from a CS placement during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT22-091", as: "arata" },
          { card: "BT22-019", as: "csCard" },
        ],
        battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-043"] }],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("csCard").instanceId]);
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-091")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(false);
  });

  it("suppresses the inherited draw for the rest of this turn, then resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016"],
          hand: ["BT1-009"],
          battleArea: [{ card: "BT22-047", as: "host", under: ["BT22-043", "BT22-046"] }],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceCard = s.perm("host").stack.find((card) => card.cardId === "BT22-043")!;
    const sourceInstanceId = sourceCard.instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const effectKey = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((effect) => effect.instanceId === sourceInstanceId && effect.effectKey.startsWith("BT22-043/"))?.effectKey;
    expect(effectKey).toBeDefined();
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: effectKey! })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("host").topCard?.cardId).toBe("BT22-046");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT22-047", "BT22-043"]);
    const handAfterFirst = s.state.players[0]!.hand.length;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: effectKey! }).ok).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(handAfterFirst);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: effectKey! })).toEqual({
      ok: true,
    });
    await settle();
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.state.players[0]!.hand.length).toBe(handAfterFirst + 2);
    expect(s.perm("host").topCard?.cardId).toBe("BT22-043");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT22-046", "BT22-047"]);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
