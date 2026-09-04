import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-024.js";
import "../index.js";

describe("EX5-024 Azulongmon", () => {
  it("has Blast Digivolve and returns an opposing level five or lower Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords).toMatchObject([
      { keyword: "BlastDigivolve" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 5 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 5 } } },
    });
  });
  it("unsuspends one own Deva, Four Great Dragons, or Four Sovereigns", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[1]).toMatchObject({
      kind: "Unsuspend",
      target: {
        filter: {
          controller: "mine",
          nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Great Dragons", "Four Sovereigns"] }],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({
      kind: "Unsuspend",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Great Dragons", "Four Sovereigns"] }],
        },
      },
    });
  });
  it("deletes one opposing Digimon with the highest level on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" }, count: 1 },
    });
  });

  it("returns an opposing level-five Digimon and unsuspends one own traited Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-021", as: "deva", suspended: true }],
          hand: [{ card: "EX5-024", as: "azulongmon" }],
        },
        1: {
          battleArea: [
            { card: "EX5-021", as: "levelFive" },
            { card: "BT1-080", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("azulongmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "EX5-021"));

    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("EX5-021");
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toContain("BT1-080");
    expect(s.perm("deva").isSuspended).toBe(false);
  });

  it("returns a level-five Digimon and unsuspends on public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-021", as: "base", suspended: true }],
          hand: [{ card: "EX5-024", as: "azulongmon" }],
        },
        1: {
          battleArea: [
            { card: "EX5-021", as: "levelFive" },
            { card: "BT1-080", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("azulongmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-024");

    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toContain("EX5-021");
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toContain("BT1-080");
    expect(s.perm("base").isSuspended).toBe(false);
  });

  it("deletes the highest-level opposing Digimon on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-024", as: "azulongmon" }] },
        1: {
          battleArea: [
            { card: "EX5-021", as: "levelFive" },
            { card: "BT1-080", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("azulongmon").permanentId], "byEffect");
    await settle(
      () => !s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("azulongmon").permanentId),
    );

    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["EX5-021"]);
  });
});
