import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-090.js";

describe("BT15-090", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-090")).toMatchObject({
      nameEn: "Fox Fire",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("uses exactly one return branch, replacing the level gate with lowest level when qualified", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "ConditionalBranch",
      condition: { kind: "youHave" },
      ifTrue: [{ kind: "Return", target: { filter: { superlative: "lowestLevel" } } }],
      ifFalse: [{ kind: "Return", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    });
  });
  it("activates its main effect in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));

  it("naturally returns the lowest-level opposing Digimon when Gabumon is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "gabumon" }],
          hand: [{ card: "BT15-090", as: "fox" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowLevel", dp: 12000 },
            { card: "BT1-036", as: "highLevel", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fox").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("lowLevel").instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lowLevel").permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("highLevel").permanentId)).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("naturally limits the unqualified branch to level 4 or lower", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-090", as: "fox" }] },
        1: {
          battleArea: [
            { card: "BT1-036", as: "level4", dp: 1000 },
            { card: "BT1-040", as: "level5", dp: 12000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("fox").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("level4").instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("level5").permanentId)).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("naturally activates the lowest-level branch from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "gabumon" }, { card: "BT1-009", as: "attacker" }],
          security: [{ card: "BT15-090", as: "fox" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowLevel", dp: 12000 },
            { card: "BT1-036", as: "highLevel", dp: 1000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("lowLevel").instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("highLevel").permanentId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
