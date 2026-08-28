import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-096.js";

describe("BT13-096 Homer Yushima", () => {
  it("may play a blue level 3 Digimon from a digivolution card on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], levels: [3] }, count: 1 },
        },
      ],
    });
  });

  it("places a blue level 4 or lower Digimon from hand under the played Digimon", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as {
      actions?: unknown[];
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Blue"] },
    });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: {
        kind: "suspend",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        optional: true,
      },
      optional: true,
      abortOnDecline: true,
      actions: [
        {
          kind: "PlaceUnder",
          from: ["hand"],
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
              kind: ["Digimon"],
              colors: ["Blue"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
          underFilter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], isTriggerSource: true },
          position: "bottom",
          optional: true,
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("plays a blue level 3 from its digivolution cards on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-096", as: "homer", under: ["BT1-030"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("homer"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-030"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-030")).toBe(true);
  });

  it("naturally suspends Homer and places a blue level-4-or-lower card under the played source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-096", as: "homer" }],
          hand: [
            { card: "BT1-027", as: "played-blue" },
            { card: "BT1-028", as: "placed-blue" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played-blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("homer").isSuspended && s.perm("played-blue").stack.length === 1);
    expect(s.perm("homer").isSuspended).toBe(true);
    expect(s.perm("played-blue").stack.at(-1)?.instanceId).toBe(s.inst("placed-blue").instanceId);
  });

  it("declining the optional suspend leaves the played source and hand card unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-096", as: "homer" }],
          hand: [
            { card: "BT1-027", as: "played-blue" },
            { card: "BT1-028", as: "placed-blue" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played-blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("played-blue").instanceId));
    expect(s.perm("homer").isSuspended).toBe(false);
    expect(s.perm("played-blue").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("placed-blue").instanceId)).toBe(true);
  });

  it("allows the suspend cost and nested placement may to be declined independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-096", as: "homer" }],
          hand: [
            { card: "BT1-027", as: "played-blue" },
            { card: "BT1-028", as: "placed-blue" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played-blue").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const costDecision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: costDecision.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const placementDecision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: placementDecision.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await settle(() => s.perm("homer").isSuspended);
    expect(s.perm("homer").isSuspended).toBe(true);
    expect(s.perm("played-blue").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("placed-blue").instanceId)).toBe(true);
  });
});
