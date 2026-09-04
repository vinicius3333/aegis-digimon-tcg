import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-060.js";

describe("EX7-060", () => {
  it("plays itself from trash with its cost reduced by 4 when you have four or fewer cards in hand", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: true,
      reduceCostBy: 4,
      condition: { kind: "zoneCount", value: 4 },
    }));
  it("has Blocker and on deletion may play a level 5 or lower Dark Dragon or Evil Dragon from trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { levelComparison: { op: "lte", value: 5 } } },
    });
  });

  it("publicly plays from trash for 4 less memory when the hand gate is met", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX7-060", as: "nidhogg" }],
          hand: ["BT1-009", "BT1-010", "BT1-014", "BT1-038"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("nidhogg"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-060"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-060")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("nidhogg").instanceId)).toBe(false);
    expect(s.state.memory).toBe(3);
  });

  it("does not play from trash when the hand has more than four cards", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [{ card: "EX7-060", as: "nidhogg" }],
          hand: ["BT1-009", "BT1-010", "BT1-014", "BT1-038", "BT1-040"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnDeclaration, s.inst("nidhogg"));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("nidhogg").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("publicly plays a level 5 or lower Dark Dragon from trash after deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-060", as: "nidhogg" }], trash: [{ card: "EX7-056", as: "darkDragon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nidhogg"), "Blocker")).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("nidhogg").permanentId], "byBattle")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-056"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-056")).toBe(true);
  });
});
