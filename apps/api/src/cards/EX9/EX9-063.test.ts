import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX9-063.js";
import "../index.js";

describe("EX9-063", () => {
  it.each(["BT1-009", "EX9-009"])(
    "pays the hidden cost but cannot play a revealed nonmatching card (%s)",
    async (hidden) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX9-063", as: "host", under: [{ card: hidden, faceUp: false }, "EX9-060"] }] },
          1: { security: ["BT1-010", "BT1-048"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-060"]);
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-063"]);
      expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([hidden]);
      expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("can play the DM Digimon just trashed as its own bottom-source cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-063", as: "host", under: [{ card: "EX9-010", faceUp: false }, "EX9-059"] }] },
        1: { security: ["BT1-010", "BT1-048"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-059"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-063", "EX9-010"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([true, false])(
    "validates the off-color DM evolution independently of the Nanimon route (DM=%s)",
    async (dm) => {
      const base = dm ? "EX9-009" : "BT1-016";
      const s = setupEngine(
        { 0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-063", as: "evo" }], deck: ["BT1-046"] } },
        { autoDeclineOptional: true },
      );
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
          useAlternateCost: true,
        }).ok,
      ).toBe(dm);
      await settle();
      expect(s.perm("host").topCard.cardId).toBe(dm ? "EX9-063" : base);
      expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(dm ? [base] : []);
      expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(dm ? ["BT1-046"] : ["EX9-063"]);
      expect(s.state.memory).toBe(dm ? 1 : 5);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("cannot pay the attack cost with a face-up own source or another Digimon's face-down source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-063", as: "host", under: ["EX9-038"] },
            { card: "BT1-009", as: "other", under: [{ card: "BT1-046", faceUp: false }] },
          ],
          trash: ["EX9-010"],
        },
        1: { security: ["BT1-048", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX9-038"]);
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-010"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("shares the free-play once-per-turn use between real digivolution and a later attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-038",
              as: "host",
              under: [
                { card: "BT1-046", faceUp: false },
                { card: "BT1-048", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "EX9-063", as: "evo" }],
          trash: ["BT1-016", "EX9-009", "EX9-010", "EX9-010"],
          deck: ["BT1-048"],
        },
        1: { security: ["BT1-010", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "EX9-010")).toHaveLength(
      1,
    );
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-048", "EX9-038"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "EX9-010")).toHaveLength(
      1,
    );
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX9-010")).toHaveLength(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-016", "EX9-009", "EX9-010", "BT1-046"]);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-048", "EX9-038"]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["accept", "decline", "no ally"] as const)("resolves Scapegoat in a losing battle (%s)", async (choice) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-063", as: "host", suspended: true },
            ...(choice === "no ally" ? [] : [{ card: "BT1-009", as: "ally" }]),
          ],
        },
        1: { battleArea: [{ card: "BT1-024", as: "attacker" }] },
      },
      { autoSelectCards: choice === "accept" },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    if (choice === "decline") {
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const decision = s.state.pendingDecision!;
      const response = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      });
      if (!response.ok) throw new Error("Scapegoat refusal was rejected");
    }
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      choice === "accept" ? ["EX9-063"] : choice === "decline" ? ["BT1-009"] : [],
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      choice === "accept" ? ["BT1-009"] : ["EX9-063"],
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("does not grant its incoming-card reduction to a different evolution while already in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-063", as: "resident", under: [{ card: "BT1-046", faceUp: false }] },
          { card: "EX9-051", as: "host", under: [{ card: "BT1-048", faceUp: false }] },
        ],
        hand: [{ card: "BT2-063", as: "evo" }],
        deck: ["BT1-048"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("BT2-063");
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits Alliance on a legal purple level-six host for two security checks and attack-only DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-089", as: "host", under: ["EX9-063"] },
          { card: "BT1-024", as: "ally" },
        ],
      },
      1: { security: ["BT1-084", "BT1-048"] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(12000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.events.find((event) => event.kind === "alliancePrompt")).toMatchObject({
      eligibleAllyIds: [s.perm("ally").permanentId],
    });
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-084", "BT1-048"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("host").currentDP).toBe(12000);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it.each([0, 1, 2, 5])(
    "reduces a real Ver.4 evolution by the %s face-down sources, floored at zero",
    async (count) => {
      const hidden = ["BT1-046", "BT1-048", "BT1-010", "BT1-009", "BT1-016"].slice(0, count);
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX9-038", as: "host", under: hidden.map((card) => ({ card, faceUp: false })) }],
            hand: [{ card: "EX9-063", as: "evo" }],
            deck: ["BT1-048"],
          },
        },
        { autoDeclineOptional: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").topCard.cardId).toBe("EX9-063");
      expect(s.state.memory).toBe(10 - Math.max(0, 4 - count));
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([...hidden, "EX9-038"]);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-048"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("does not apply the Ver.4 reduction to a name-only Nanimon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-058", as: "host", under: [{ card: "BT1-046", faceUp: false }] }],
          hand: [{ card: "EX9-063", as: "evo" }],
          deck: ["BT1-048"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-063");
    expect(s.state.memory).toBe(7);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-046", "BT6-058"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Scapegoat and reduces Ver.4 digivolution cost by one per source", () => {
    expect(
      compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Scapegoat"))?.keywords,
    ).toContainEqual({ keyword: "Scapegoat", raw: "＜Scapegoat＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.actions.length > 0)).toMatchObject({
      actions: [{ actions: [{ mode: "reduceCost", amount: 1, scaling: { filter: { faceDown: true } } }] }],
    });
  });
  it("once per turn plays a low-cost DM Digimon from trash by trashing the bottom face-down source", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                faceDown: true,
                position: "bottom",
                hostFilter: { isSelfRef: true },
              },
            },
          },
        },
      ],
    }));
  it("inherits Alliance", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Alliance",
      raw: "＜Alliance＞",
    }));
  it.each([
    ["WhenDigivolving", EffectTiming.WhenDigivolving],
    ["WhenAttacking", EffectTiming.OnUseAttack],
  ] as const)("%s trashes the bottom face-down source and plays one DM Digimon from trash", async (_label, timing) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-063", as: "source", under: [{ card: "EX9-015", faceUp: false }, "EX9-010"] }],
          trash: ["EX9-010"],
        },
        1: { battleArea: [{ card: "BT1-010", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    if (timing === EffectTiming.OnUseAttack) {
      s.state.turnSeat = 0;
      const result = s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.state.players[1]!.battleArea[0]!.permanentId },
      });
      if (!result.ok) throw new Error(`Attack declaration failed: ${JSON.stringify(result)}`);
    } else {
      await advance(s.engine).fireForPermanent(timing, s.perm("source"));
    }
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-010"));

    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.perm("source").stack[0]).toMatchObject({ cardId: "EX9-010", faceUp: true });
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX9-015")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-010")).toBe(true);
  });
  it("preserves the source stack and trash when the optional free-play effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-063", as: "source", under: [{ card: "EX9-015", faceUp: false }, "EX9-010"] }],
          trash: ["EX9-010"],
        },
        1: { security: ["BT1-010", "BT1-048"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("source").stack.map(({ cardId, faceUp }) => ({ cardId, faceUp }))).toEqual([
      { cardId: "EX9-015", faceUp: false },
      { cardId: "EX9-010", faceUp: true },
    ]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX9-010"]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["EX9-063"]);
    expect(s.state.players[1]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-048"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});
