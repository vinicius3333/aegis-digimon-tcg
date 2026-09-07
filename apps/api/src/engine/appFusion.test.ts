import { describe, expect, it } from "vitest";
import { EffectDuration, Phase } from "@aegis/shared";
import "../cards/EX3/EX3-016.js";
import "../cards/EX3/EX3-019.js";
import "../cards/BT5/BT5-091.js";
import "../cards/BT20/BT20-078.js";
import "../cards/BT23/BT23-079.js";
import { advance } from "./testkit/advance.js";
import { settle, setupEngine } from "./testkit/harness.js";
import { internalsOf } from "./testkit/internals.js";
import type { DecisionManager } from "./decisions/index.js";

describe("public App Fusion", () => {
  it("declares App Fusion from a linked physical material", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
          hand: [{ card: "BT23-021", as: "result" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const oldTopId = s.perm("host").topCard!.instanceId;
    s.state.memory = 0;
    await s.ready();
    expect(
      s
        .inst("result")
        .appFusionRoutes.map(({ hostPermanentId, linkedInstanceId, projectedCost }) => ({
          hostPermanentId,
          linkedInstanceId,
          projectedCost,
        })),
    ).toEqual([
      { hostPermanentId: s.perm("host").permanentId, linkedInstanceId: s.inst("link").instanceId, projectedCost: 0 },
    ]);
    const projectedRoute = s.inst("result").appFusionRoutes[0];
    await s.engine.recomputeContinuousEffects();
    expect(s.inst("result").appFusionRoutes[0]).toBe(projectedRoute);
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("link").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT23-021");
    expect(s.perm("host").topCard?.cardId).toBe("BT23-021");
    expect(s.perm("host").enteredByEffect).toBe(false);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "digivolved", mechanic: "appFusion", cardId: "BT23-021" }),
    );
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([oldTopId, s.inst("link").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT23-021");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.memory).toBe(0);
    expect(s.inst("result").appFusionRoutes).toHaveLength(0);
  });

  it("clears projected App Fusion routes when the linked material leaves the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
        hand: [{ card: "BT23-021", as: "result" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    expect(s.inst("result").appFusionRoutes).toHaveLength(1);
    const [removed] = s.perm("host").linked.splice(0, 1);
    if (removed) s.state.players[0]!.trash.push(removed);
    await s.engine.recomputeContinuousEffects();
    expect(s.inst("result").appFusionRoutes).toHaveLength(0);
  });

  it.each(["deck", "face-down security"] as const)(
    "clears projected routes when the hand card moves to %s",
    async (destination) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
          hand: [{ card: "BT23-021", as: "result" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      });
      await s.ready();
      const result = s.inst("result");
      expect(result.appFusionRoutes).toHaveLength(1);
      const handIndex = s.state.players[0]!.hand.findIndex(({ instanceId }) => instanceId === result.instanceId);
      const [moved] = s.state.players[0]!.hand.splice(handIndex, 1);
      if (moved === undefined) throw new Error("projection fixture result missing from hand");
      if (destination === "deck") s.state.players[0]!.deck.push(moved);
      else {
        moved.faceUp = false;
        s.state.players[0]!.security.push(moved);
      }
      await s.engine.recomputeContinuousEffects();
      expect(result.appFusionRoutes).toHaveLength(0);
      expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === result.instanceId)).toBe(false);
    },
  );

  it("clears projected routes outside the owner's Main turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
        hand: [{ card: "BT23-021", as: "result" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    const result = s.inst("result");
    expect(result.appFusionRoutes).toHaveLength(1);
    s.state.phase = Phase.End;
    await s.engine.recomputeContinuousEffects();
    expect(result.appFusionRoutes).toHaveLength(0);
    s.state.phase = Phase.Main;
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(result.appFusionRoutes).toHaveLength(0);
  });
  it("uses the declared second physical link and leaves the first linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT23-016",
              as: "host",
              linked: [
                { card: "BT23-039", as: "first" },
                { card: "BT23-007", as: "second" },
              ],
            },
          ],
          hand: [{ card: "BT23-021", as: "result" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const oldTopId = host.topCard!.instanceId;
    advance(s.engine).ledgers.continuous.addLinkMaxGrant(host.permanentId, 1, EffectDuration.UntilEachTurnEnd);
    await advance(s.engine).recompute();
    s.state.memory = 0;
    expect(s.inst("result").appFusionRoutes.map(({ linkedInstanceId }) => linkedInstanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("second").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT23-021");
    expect(host.stack.map((card) => card.instanceId)).toEqual([oldTopId, s.inst("second").instanceId]);
    expect(host.linked.map((card) => card.instanceId)).toEqual([s.inst("first").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("resolves the public App Fusion entry window before reporting completion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
          hand: [{ card: "BT23-021", as: "result" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("link").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT23-021" && s.state.pendingDecision === undefined, 1000);
    expect(host.topCard?.cardId).toBe("BT23-021");
    expect(host.enteredByEffect).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("fires a real own-Digimon-digivolves watcher during public App Fusion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-091", as: "takumi" },
            { card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] },
          ],
          hand: [{ card: "BT23-021", as: "result" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("link").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT23-021" && s.state.pendingDecision === undefined, 1000);
    expect(host.topCard?.cardId).toBe("BT23-021");
    expect(s.perm("takumi").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("does not satisfy Reapermon's effect-only digivolution watcher on public App Fusion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
          hand: [{ card: "BT23-021", as: "result" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT20-078", as: "reapermon" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const oldTopId = host.topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("link").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT23-021" && s.state.pendingDecision === undefined, 1000);
    expect(host.stack.map((card) => card.instanceId)).toEqual([oldTopId, s.inst("link").instanceId]);
    expect(host.topCard?.cardId).toBe("BT23-021");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("result").instanceId);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("rejects effect App Fusion when its hand result moves during an awaited window", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
        hand: [{ card: "BT23-021", as: "result" }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "EX3-019", as: "tax", under: [{ card: "EX3-016" }] }], deck: ["BT1-011"] },
    });
    await s.ready();
    s.state.memory = 1;
    const host = s.perm("host");
    const result = s.inst("result");
    const topId = host.topCard!.instanceId;
    const linkId = s.inst("link").instanceId;
    const decisions = (internalsOf(s.engine) as unknown as { decisions: DecisionManager }).decisions;
    advance(s.engine).ledgers.subTriggers.subscribeReplacement({
      event: "wouldDigivolve",
      sourcePermanentId: host.permanentId,
      mode: "instead",
      appliesTo: () => true,
      apply: async () => {
        await decisions.request({ seat: 0, kind: "optional", promptText: "Effect App Fusion mutation probe" });
      },
      description: "Effect App Fusion hand-result zone regression",
    });
    const primitives = (
      internalsOf(s.engine) as unknown as {
        primitives: { appFuseInto: (...args: [string, string, string]) => Promise<unknown> };
      }
    ).primitives;
    const fusionPromise = primitives.appFuseInto(host.permanentId, result.instanceId, linkId);
    await settle(() => s.state.pendingDecision?.kind === "optional", 1500);
    const resultIndex = s.state.players[0]!.hand.findIndex(({ instanceId }) => instanceId === result.instanceId);
    if (resultIndex < 0) throw new Error("effect App Fusion result left hand before mutation probe");
    const [movedResult] = s.state.players[0]!.hand.splice(resultIndex, 1);
    if (movedResult) s.state.players[0]!.trash.push(movedResult);
    const pending = s.state.pendingDecision;
    if (pending === undefined) throw new Error("effect App Fusion mutation prompt did not open");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await expect(fusionPromise).resolves.toBeUndefined();
    await settle(() => s.state.pendingDecision === undefined, 1500);
    expect(host.topCard?.instanceId).toBe(topId);
    expect(host.linked.map(({ instanceId }) => instanceId)).toEqual([linkId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([result.instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(1);
    expect(s.events.some((event) => event.kind === "digivolved" && event.cardId === "BT23-021")).toBe(false);
  });

  it("lets an effect-driven Eri App Fusion satisfy Reapermon's by-effect watcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT23-016", as: "host" },
          ],
          hand: [
            { card: "BT23-039", as: "partner" },
            { card: "BT23-021", as: "result" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT20-078", as: "reapermon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("partner").instanceId,
        targetPermanentId: host.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && host.topCard?.cardId === "BT23-039", 1500);
    expect(host.topCard?.cardId).toBe("BT23-039");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("result").instanceId);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it.each(["trash", "foreign"] as const)("rejects App Fusion with a %s material/result without mutation", (kind) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
        hand: kind === "foreign" ? [{ card: "BT23-021", as: "result" }] : [],
        trash: kind === "trash" ? [{ card: "BT23-021", as: "result" }] : [],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", linked: ["BT23-039"] }] },
    });
    const oldTopId = s.perm("host").topCard!.instanceId;
    const resultId = s.inst("result").instanceId;
    const handBefore = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("host").permanentId,
        instanceId: resultId,
        linkedInstanceId: kind === "foreign" ? "foreign-link-instance" : s.inst("link").instanceId,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("host").topCard?.instanceId).toBe(oldTopId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(handBefore);
  });

  it("applies an opponent SnowAgumon inherited digivolution tax to App Fusion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-019", as: "tax", under: [{ card: "EX3-016" }] }],
          security: 10,
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
          hand: [{ card: "BT23-021", as: "result" }],
          security: 10,
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const host = s.perm("host");
    expect(s.inst("result").appFusionRoutes).toHaveLength(1);
    expect(s.inst("result").appFusionRoutes[0]!.projectedCost).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("link").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT23-021");
    expect(host.topCard?.cardId).toBe("BT23-021");
    expect(s.state.memory).toBe(-1);
  });

  it("rejects a tax-adjusted App Fusion synchronously when memory cannot pay", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-019", as: "tax", under: [{ card: "EX3-016" }] }],
          security: 10,
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
          hand: [{ card: "BT23-021", as: "result" }],
          security: 10,
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    s.state.memory = -10;
    const host = s.perm("host");
    const before = host.topCard!.instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("link").instanceId,
      }),
    ).toEqual({ ok: false, reason: "insufficient-memory" });
    expect(host.topCard?.instanceId).toBe(before);
    expect(host.linked).toHaveLength(1);
    expect(s.state.memory).toBe(-10);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("BT23-021");
  });

  it.each(["link", "result"] as const)(
    "rejects public App Fusion when an awaited cost reducer moves the %s",
    async (moved) => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
          hand: [{ card: "BT23-021", as: "result" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "EX3-019", as: "opponent", under: [{ card: "EX3-016" }] }],
          security: 10,
          deck: ["BT1-009"],
        },
      });
      s.state.memory = 0;
      await s.ready();
      const host = s.perm("host");
      const topId = host.topCard!.instanceId;
      const linkId = s.inst("link").instanceId;
      const resultId = s.inst("result").instanceId;
      let movedOnce = false;
      const decisions = (internalsOf(s.engine) as unknown as { decisions: DecisionManager }).decisions;
      advance(s.engine).ledgers.subTriggers.subscribeReplacement({
        event: "wouldDigivolve",
        sourcePermanentId: host.permanentId,
        controllerSeat: 0,
        mode: "reduceCost",
        amount: 0,
        appliesTo: () => true,
        activate: async () => {
          const response = await decisions.request({
            seat: 0,
            kind: "optional",
            promptText: "Mutation regression: continue?",
          });
          if (response.kind !== "optional" || response.accept !== true) return 0;
          return 0;
        },
        description: "App Fusion stale identity regression",
      });
      expect(
        s.engine.applyIntent(0, {
          type: "appFusion",
          permanentId: host.permanentId,
          instanceId: resultId,
          linkedInstanceId: linkId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional", 1000);
      movedOnce = true;
      if (moved === "link") {
        const [movedCard] = host.linked.splice(0, 1);
        if (movedCard) s.state.players[0]!.trash.push(movedCard);
      } else {
        const resultIndex = s.state.players[0]!.hand.findIndex((card) => card.instanceId === resultId);
        const [movedCard] = s.state.players[0]!.hand.splice(resultIndex, 1);
        if (movedCard) s.state.players[0]!.trash.push(movedCard);
      }
      const pending = s.state.pendingDecision;
      if (pending === undefined) throw new Error("mutation regression prompt did not open");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settle(() => movedOnce && s.state.pendingDecision === undefined, 1000);
      expect(host.topCard?.instanceId).toBe(topId);
      expect(host.linked.map((card) => card.instanceId)).toEqual(moved === "link" ? [] : [linkId]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(moved === "link" ? [resultId] : []);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([moved === "link" ? linkId : resultId]);
      expect(s.state.memory).toBe(0);
      expect(s.events.some((event) => event.kind === "digivolved" && event.cardId === "BT23-021")).toBe(false);
    },
  );

  it("allows printed-zero App Fusion at -10 when the source has a legal egg", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-019", as: "tax", under: [{ card: "EX3-016" }] }],
          security: 10,
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT23-016", as: "host", under: [{ card: "BT1-003" }], linked: [{ card: "BT23-039", as: "link" }] },
          ],
          hand: [{ card: "BT23-021", as: "result" }],
          security: 10,
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    s.state.memory = -10;
    const host = s.perm("host");
    expect(
      s.engine.applyIntent(1, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("link").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT23-021");
    expect(host.topCard?.cardId).toBe("BT23-021");
    expect(s.state.memory).toBe(-10);
  });

  it.each([
    [
      "wrong phase",
      (s: ReturnType<typeof setupEngine>) => {
        s.state.phase = Phase.End;
      },
      "wrong-phase",
    ],
    [
      "wrong turn",
      (s: ReturnType<typeof setupEngine>) => {
        s.state.turnSeat = 1;
      },
      "not-your-turn",
    ],
    [
      "breeding source",
      (s: ReturnType<typeof setupEngine>) => {
        const player = s.state.players[0]!;
        const source = player.battleArea.shift()!;
        source.inBreeding = true;
        player.breeding = source;
      },
      "illegal-target",
    ],
  ] as const)("rejects App Fusion with %s before mutation", (_label, mutate, reason) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "link" }] }],
        hand: [{ card: "BT23-021", as: "result" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    mutate(s);
    const host = s.perm("host");
    const beforeTop = host.topCard!.instanceId;
    const beforeHand = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: host.permanentId,
        instanceId: s.inst("result").instanceId,
        linkedInstanceId: s.inst("link").instanceId,
      }),
    ).toEqual({ ok: false, reason });
    expect(host.topCard?.instanceId).toBe(beforeTop);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(beforeHand);
  });
});
