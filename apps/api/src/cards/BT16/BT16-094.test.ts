import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-094.js";
import "../index.js";

describe("BT16-094", () => {
  it("models Delay and reveals Four Great Dragons or yellow cards", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 1, to: "hand" }] },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Modal",
          choose: 1,
          optionConditions: [{ kind: "youHave" }, { kind: "youHave" }],
        },
        { kind: "ModifyDP", amount: -7000, duration: "forTheTurn", condition: { kind: "ifThisEffectActed" } },
      ],
    });
    expect(irNode(compiled.effects?.[1]?.actions?.[0])?.options?.[0]?.[0]).toMatchObject({
      kind: "PlaceInBattleAreaSelf",
      target: { filter: { kind: ["Option"], zone: "hand" }, from: ["hand"] },
    });
    expect(irNode(compiled.effects?.[0]?.actions?.[0])?.add?.[0]?.orFilters).toEqual([
      { controllerDefault: "mine", colors: ["Yellow"] },
    ]);
  });

  it("reduces an opponent by 7000 and places itself from security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ModifyDP", amount: -7000, duration: "forTheTurn" }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("reveals four, adds a matching card, and places itself after Main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "yellowSource" }],
          hand: [{ card: "BT16-094", as: "dragonBreath" }],
          deck: ["BT14-018", "BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dragonBreath").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT16-094"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-018")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("uses Delay to place Trial or trash a Four Great Dragons card, then applies -7000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-094", as: "dragonBreath" }], hand: [{ card: "EX3-069", as: "trial" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoChooseOption: true, autoSelectCards: true },
    );
    s.perm("dragonBreath").placedByEffect = true;
    s.state.turnCount += 1;
    await s.ready();

    const delay = (
      observe(s.engine).activatableEffects(s.perm("dragonBreath")) as Array<{ description: string; effectKey: string }>
    ).find((entry) => /delay/i.test(entry.description));
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("dragonBreath").topCard!.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX3-069")).toBe(true);
  });
});
