import "./ST12-15.js";
import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST12-15 From Master to Disciple", () => {
  it("can be used with only a hatched red Digi-Egg in the breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "ST12-01", as: "gurimon" },
          hand: [{ card: "ST12-15", as: "option" }],
          deck: ["ST12-10", "BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST12-15"));

    expect(s.state.players[0]!.breeding?.permanentId).toBe(s.perm("gurimon").permanentId);
  });

  it("still rejects the red Option when the only hatched Digi-Egg is blue", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "upamon" },
        hand: [{ card: "ST12-15", as: "option" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("publishes the identities of every revealed card with the selection decision", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST12-15", as: "option" }],
          battleArea: ["ST12-04"],
          deck: [
            { card: "ST12-10", as: "hit" },
            { card: "ST12-12", as: "second-hit" },
            { card: "BT1-001", as: "miss" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "selectCards"));

    const request = s.decisions.find((decision) => decision.req.kind === "selectCards")!.req;
    expect(request.options?.visibleCards).toEqual([
      { instanceId: s.inst("hit").instanceId, cardId: "ST12-10" },
      { instanceId: s.inst("second-hit").instanceId, cardId: "ST12-12" },
      { instanceId: s.inst("miss").instanceId, cardId: "BT1-001" },
    ]);
  });

  it("opens its reveal selection without confirming the lone mandatory effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST12-15", as: "option" }],
          battleArea: ["ST12-04"],
          deck: ["ST12-10", "BT1-001", "BT1-002"],
        },
      },
      { autoOrderTriggers: false },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);

    expect(s.state.pendingDecision?.kind).toBe("selectCards");
    expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(false);
  });

  it("finishes the effect after the player answers the revealed-card decision", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST12-15", as: "option" }],
          battleArea: ["ST12-04"],
          deck: [
            { card: "ST12-10", as: "hit" },
            { card: "BT1-001", as: "miss-one" },
            { card: "BT1-002", as: "miss-two" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("hit").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST12-15"),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("hit").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("miss-one").instanceId,
      s.inst("miss-two").instanceId,
    ]);
  });

  it("reveals 3, adds a matching card, trashes the rest and places itself in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-04"],
          hand: [{ card: "ST12-15", as: "option" }],
          deck: [{ card: "ST12-10", as: "hit" }, "BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST12-15"));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("hit").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("places itself even when the reveal has no matching card (Q762)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST12-04"],
          hand: [{ card: "ST12-15", as: "option" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST12-15"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST12-15")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });

  it("performs the reveal and placement from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST12-15", as: "option", faceUp: true }], deck: ["ST12-10", "BT1-001", "BT1-002"] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST12-15")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("uses Delay on a later turn to reduce the next digivolution cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST12-08", as: "base" }, { card: "ST12-08", as: "base2" }, "ST12-04"],
          hand: [
            { card: "ST12-15", as: "option" },
            { card: "ST12-10", as: "evolving" },
            { card: "ST12-10", as: "evolving2" },
          ],
          deck: ["ST12-10", "BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST12-15"));
    const delay = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST12-15")!;
    const delayId = delay.topCard.instanceId;
    expect(JSON.parse(delay.activatableEffectsJson || "[]")).toHaveLength(0);
    s.state.turnCount += 1;
    await s.engine.recomputeContinuousEffects();
    const activatable = JSON.parse(delay.activatableEffectsJson || "[]") as Array<{
      instanceId: string;
      effectKey: string;
      description: string;
    }>;
    const delayEffect = activatable.find((entry) => entry.instanceId === delayId && /delay/i.test(entry.description));
    expect(delayEffect).toBeDefined();
    const effectKey = delayEffect!.effectKey;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: delayId, effectKey })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === delayId));
    await settle();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST12-10");
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base2").permanentId,
        instanceId: s.inst("evolving2").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base2").topCard.cardId === "ST12-10");
    expect(s.state.memory).toBe(-2);
  });

  it("applies Delay to a paid effect-driven digivolution (Q763)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST12-08", as: "base" }, "ST12-04"],
          hand: [
            { card: "ST12-15", as: "option" },
            { card: "ST12-10", as: "evolving" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST12-15"));
    const delay = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST12-15")!;
    s.state.turnCount += 1;
    await s.engine.recomputeContinuousEffects();
    const delayEffect = (
      JSON.parse(delay.activatableEffectsJson || "[]") as Array<{
        instanceId: string;
        effectKey: string;
        description: string;
      }>
    ).find((entry) => entry.instanceId === delay.topCard.instanceId && /delay/i.test(entry.description));
    expect(delayEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delay.topCard.instanceId,
        effectKey: delayEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === delay.topCard.instanceId));
    await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("evolving").instanceId, {
      payCost: true,
    });

    expect(s.perm("base").topCard.cardId).toBe("ST12-10");
    expect(s.state.memory).toBe(2);
  });
});
