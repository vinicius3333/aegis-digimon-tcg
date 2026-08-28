import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-061.js";
import "../index.js";

describe("BT16-061 DoruGreymon", () => {
  it("has Collision and both exact alternate evolution routes", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-061", as: "doru" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("doru"), "Collision")).toBe(true);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Dorugamon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["SoC"], cost: 3, isAlternate: true },
    ]);
  });

  it("digivolves for free after its attack target switches when an SoC Tamer is underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-061", as: "doru", under: [{ card: "BT14-087" }] }],
          hand: [{ card: "BT16-064", as: "dorugora" }],
        },
        1: { battleArea: [{ card: "ST18-07", as: "blocker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("doru").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("doru").topCard?.cardId === "BT16-064");

    expect(s.perm("doru").topCard?.cardId).toBe("BT16-064");
  });

  it("inherits an optional once-per-turn play of a cost-5-or-lower X Antibody card from trash", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenBattleDeleteOpponent",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 5 } },
        },
      ],
    });
  });

  it("plays a qualifying X Antibody card from trash after a natural battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-064", as: "host", under: ["BT16-061"] }],
          trash: [{ card: "BT16-051", as: "target" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-051"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-051")).toBe(true);
  });
});
