import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it.each([
  ["EX9-007", "EX9-014"],
  ["EX9-014", "EX9-007"],
  ["EX9-023", "EX9-007"],
  ["EX9-035", "EX9-007"],
  ["EX9-058", "EX9-007"],
])(
  "#5011 %s lets the player add the only matching version to hand even with another DM revealed",
  async (source, other) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: source, as: "source" }],
          deck: [{ card: other, as: "other" }, { card: source, as: "wanted" }, "BT1-010"],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    const req = s.decisions.at(-1)!.req;
    expect(req.kind).toBe("selectCards");
    expect(req.options?.candidateInstanceIds).toContain(s.inst("wanted").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("wanted").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: order.options!.candidateInstanceIds! },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(s.inst("wanted").instanceId);
    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual([other, "BT1-010"]);
  },
);

it.each(["battleArea", "breeding"] as const)(
  "#5014 Digital Gate Open uses Mother D-Reaper in %s to play Cool Boy for zero",
  async (zone) => {
    const mother = { card: "EX2-007", as: "mother" };
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-206", as: "gate" }, ...(zone === "battleArea" ? [mother] : [])],
          ...(zone === "breeding" ? { breeding: mother } : {}),
          hand: [{ card: "BT20-091", as: "cool" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 8;
    await s.ready();
    const delay = observe(s.engine)
      .activatableEffects(s.perm("gate"))
      .find((e) => /delay/i.test(e.description ?? ""))!;
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delay.instanceId!,
        effectKey: delay.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-091")).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toContain("P-206");
  },
);

it.each(["option-only", "opponent-mother", "unhatched-egg"])(
  "#5014 rejects a white source that is not the controller's field Digimon: %s",
  async (source) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-206", as: "gate" }],
          hand: [{ card: "BT20-091", as: "cool" }],
          ...(source === "unhatched-egg" ? { eggDeck: ["EX2-007"] } : {}),
        },
        1: { battleArea: source === "opponent-mother" ? ["EX2-007"] : [] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 8;
    await s.ready();
    const delay = observe(s.engine)
      .activatableEffects(s.perm("gate"))
      .find((e) => /delay/i.test(e.description ?? ""))!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delay.instanceId!,
        effectKey: delay.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-091")).toBe(false);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT20-091");
    expect(s.state.memory).toBe(8);
  },
);
