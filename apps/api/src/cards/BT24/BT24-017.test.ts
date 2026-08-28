import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-017.js";
import "../index.js";

describe("BT24-017 Medusamon", () => {
  it("deletes the lowest-DP Digimon, pays the exact two-card trash cost, and scales DP", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, colors: ["Red"], cost: 3 }]);
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")!;
    expect(effect.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestDP" } },
    });
    expect(effect.actions?.[1]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "return", target: { count: 2 } },
      actions: [
        { kind: "PlayToken", tokens: ["Petrification Token"], count: 2, placedAs: "opponentDigimon" },
        { kind: "ModifyDP", amount: 2000, scaling: { per: 1, unit: "cards" } },
      ],
    });
  });

  it("deletes the lowest opposing Digimon and returns two opposing trash cards for tokens", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 3000 },
            { card: "BT1-009", as: "higher", dp: 5000 },
          ],
          trash: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    const lowestId = s.perm("lowest").permanentId;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("higher").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    const tokens = s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-"));
    expect(tokens).toHaveLength(2);
    expect(tokens.every((token) => token.controllerSeat === 1 && token.currentDP === 3000)).toBe(true);
    expect(s.perm("source").currentDP).toBe(17000);
  });

  it("does not play tokens or gain DP when the two-card return cost is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
          trash: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("source").currentDP).toBe(11000);
  });

  it("requires exactly two trash cards for the token and DP branch", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source", dp: 11000 }] },
        1: {
          trash: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[1]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("source").currentDP).toBe(11000);
  });

  it("gives Petrification Tokens their printed suspension lock and security-trash deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-017", as: "source" }] },
        1: {
          battleArea: [{ card: "BT1-009", dp: 3000 }],
          trash: ["BT1-001", "BT1-002"],
          security: ["BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    const token = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "TOKEN-Petrification-Token",
    )!;
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).isRestricted(token, "suspend")).toBe(true);
    await advance(s.engine).verb.deletePermanent([token.permanentId], "byEffect");

    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("exposes Raid, Progress, and Piercing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-017", as: "medusamon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medusamon"), "Progress")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("medusamon"))).toBe(true);
  });
});
