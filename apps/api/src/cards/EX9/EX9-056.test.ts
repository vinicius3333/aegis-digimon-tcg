import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./EX9-056.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-056", () => {
  it.each([true, false])("allows only a DM off-color level five through the cost-three route (DM=%s)", async (dm) => {
    const base = dm ? "EX9-011" : "BT1-024";
    const s = setupEngine(
      { 0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "EX9-056", as: "evo" }], deck: ["BT1-046"] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(dm);
    await settle();
    expect(s.perm("base").topCard.cardId).toBe(dm ? "EX9-056" : base);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(dm ? [base] : []);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(dm ? ["BT1-046"] : ["EX9-056"]);
    expect(s.state.memory).toBe(dm ? 2 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("Blast Digivolves for free and removes the attacking Digimon through its digivolution effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-064", as: "attacker" }], security: ["BT1-010", "BT1-048"] },
        1: {
          battleArea: [{ card: "BT10-064", as: "host" }],
          hand: [{ card: "EX9-056", as: "ace" }],
          deck: ["BT1-046"],
          security: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window missing");
    const counter = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("ace").instanceId);
    expect(counter).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: counter!.instanceId,
        effectKey: counter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-056");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT10-064"]);
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048", "BT10-064"]);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])("does not protect a nonmatching ally or opposing Ver.3 (opponent=%s)", async (opponent) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-056", as: "source" }, ...(!opponent ? [{ card: "BT10-064", as: "target" }] : [])],
          security: ["BT1-010"],
        },
        1: { battleArea: opponent ? [{ card: "EX9-059", as: "target" }] : [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[opponent ? 1 : 0]!.trash.map(({ cardId }) => cardId)).toEqual([
      opponent ? "EX9-059" : "BT10-064",
    ]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])(
    "does not prevent deletion when payment is declined or unavailable (decline=%s)",
    async (decline) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-056", as: "source" },
              { card: "EX9-059", as: "target" },
            ],
            security: decline ? ["BT1-010"] : [],
          },
        },
        { autoDeclineOptional: decline, autoAcceptOptional: !decline, autoSelectCards: true },
      );
      expect(await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect")).toBe(1);
      await settle();
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-059"]);
      expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(decline ? ["BT1-010"] : []);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    "does not pay or trash security without a valid accepted cost (decline=%s, digivolve=%s)",
    async (decline, digivolve) => {
      const target = decline ? "BT10-064" : "BT10-022";
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "EX9-056", as: "source" }],
            battleArea: digivolve ? [{ card: "BT10-064", as: "base" }] : [],
            deck: ["BT1-010"],
          },
          1: {
            // Inject the exact first excluded DP value to distinguish <= from an off-by-one bound.
            battleArea: [{ card: target, as: "target", dp: decline ? 8000 : 8001 }],
            security: ["BT1-010", "BT1-048"],
          },
        },
        { autoAcceptOptional: !decline, autoDeclineOptional: decline, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(
          0,
          digivolve
            ? { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("source").instanceId }
            : { type: "playCard", instanceId: s.inst("source").instanceId },
        ),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("target").topCard.cardId).toBe(target);
      expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-048"]);
      expect(s.state.players[1]!.trash).toHaveLength(0);
      expect(s.state.memory).toBe(digivolve ? 6 : 3);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it.each([false, true])(
    "Q4815 pays once to prevent every own Ver.3 in one simultaneous deletion (includes source=%s)",
    async (includesSource) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX9-056", as: "source" },
              { card: "EX9-059", as: "first" },
              { card: "EX9-059", as: "second" },
            ],
            security: ["BT1-010", "BT1-011"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const first = s.perm("first").permanentId;
      const second = s.perm("second").permanentId;
      const targets = includesSource ? [s.perm("source").permanentId, first, second] : [first, second];
      expect(await advance(s.engine).verb.deletePermanent(targets, "byEffect")).toBe(0);
      await settle();
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
        s.perm("source").permanentId,
        first,
        second,
      ]);
      expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
      expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-010"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("has Blast Digivolve and places an opposing 8000-DP-or-lower Digimon at the bottom of security on play or digivolution", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toContainEqual({
      keyword: "BlastDigivolve",
      raw: "＜Blast Digivolve＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects?.find((entry) => entry.trigger === trigger);
      const action = effect?.actions[0];
      expect(effect?.actions).toHaveLength(1);
      expect(action).toMatchObject({
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        abortOnDecline: true,
        cost: { kind: "place", destination: "security", position: "bottom", faceDown: true },
      });
      expect(irNode(action?.cost)?.target?.filter).toMatchObject({ dp: { op: "lte", value: 8000 } });
    }
  });
  it("once per turn prevents a Ver.3 Digimon from leaving by trashing top security", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", cost: { kind: "trashSecurityTop" } }],
    }));
  it("allows either player's qualifying Digimon as the bottom-security payment and affects all own Ver.3 leaves", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        abortOnDecline: true,
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        cost: {
          targetIsPermanent: true,
          target: { filter: { controller: "any", kind: ["Digimon"], dp: { op: "lte", value: 8000 } }, count: 1 },
          destination: "security",
          position: "bottom",
          faceDown: true,
        },
      });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      affectsAll: true,
      target: {
        filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] },
      },
    });
  });
  it("places the opposing Digimon at security bottom and trashes that player's top security on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-056", as: "source" }] },
        1: {
          battleArea: [{ card: "BT10-064", as: "target", under: ["BT10-062"] }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011", "BT10-064"]);
    expect(s.state.players[1]!.security.at(-1)?.faceUp).toBe(false);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId).sort()).toEqual(["BT1-010", "BT10-062"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places an own qualifying Digimon at its owner's security bottom on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-064", as: "source" },
            { card: "BT10-064", as: "ownTarget" },
          ],
          hand: [{ card: "EX9-056", as: "evo" }],
          deck: ["BT1-046"],
          security: ["BT1-048"],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX9-056"]);
    expect(s.perm("source").stack.map(({ cardId }) => cardId)).toEqual(["BT10-064"]);
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-048", "BT10-064"]);
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("prevents an own Ver.3 from leaving by trashing the controller's top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-056", as: "source" },
            { card: "EX9-059", as: "target" },
          ],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    expect(await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("target").topCard.cardId === "EX9-059");

    expect(s.perm("target").topCard.cardId).toBe("EX9-059");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-056"]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-010", "EX9-059"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("also prevents this Ver.3 source itself from leaving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-056", as: "source" }], security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("source").topCard.cardId === "EX9-056");

    expect(s.perm("source").topCard.cardId).toBe("EX9-056");
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });
});
