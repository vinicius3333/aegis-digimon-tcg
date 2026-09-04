import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-059.js";
import "../index.js";

describe("EX7-059", () => {
  it("pays from its own stack and uses an Option only once per turn when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-059", as: "beel", under: ["EX7-066", "EX7-066"] }],
          hand: ["EX7-066", "EX7-066"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("beel"));
    // The used Chaos Triangular replaces the paid source by placing itself underneath.
    expect(s.perm("beel").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX7-066")).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("beel"));
    expect(s.perm("beel").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX7-066")).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "recovers and uses a qualifying Option for free at %s",
    async (timing) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX7-059", as: "beel" }], trash: [{ card: "EX7-066", as: "option" }] },
          1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 5;
      await advance(s.engine).fire(timing, s.perm("beel"));
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
      expect(s.state.memory).toBe(5);
    },
  );

  it("keeps the recovered Option in hand when its optional use is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-059", as: "beel" }], trash: [{ card: "EX7-066", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beel"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("cannot pay its attack cost using another Digimon's Option source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-059", as: "beel" },
            { card: "BT1-009", as: "other", under: ["EX7-066"] },
          ],
          hand: [{ card: "EX7-066", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("beel"));
    expect(s.perm("other").stack).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Blast Digivolves from hand onto a level 5 Digimon with Three Musketeers in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-044", as: "base" }],
          hand: [{ card: "EX7-059", as: "beel" }],
          trash: [{ card: "EX7-066", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("beel").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX7-059");

    expect(s.perm("base").topCard?.cardId).toBe("EX7-059");
    expect(s.perm("base").stack.some((card) => card.cardId === "EX7-044")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("has Blast Digivolve and returns an Option from trash before using a Three Musketeers Option without cost", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Return", to: "hand", target: { count: 1 } },
      { kind: "UseOptionWithoutCost", payCost: false, from: ["hand"], optional: true },
    ]);
  });
  it("uses a Three Musketeers Option when attacking by trashing an Option from its digivolution cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      cost: {
        kind: "trash",
        target: { count: 1, filter: { hostFilter: { isSelfRef: true }, zone: "digivolutionCards" } },
      },
      optional: true,
    }));
});
