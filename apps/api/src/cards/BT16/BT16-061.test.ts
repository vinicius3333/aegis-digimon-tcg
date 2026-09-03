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
        1: { battleArea: [{ card: "BT1-009", as: "blocker" }] },
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
    expect(s.state.memory).toBe(0);
  });

  it("does not offer the free target-switch digivolution without an SoC Tamer underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-061", as: "doru" }],
          hand: [{ card: "BT16-064", as: "dorugora" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "blocker" }] },
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
    await settle(() => false, 50);

    expect(s.perm("doru").topCard?.cardId).toBe("BT16-061");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-064")).toBe(true);
  });

  it("inherits an optional once-per-turn play whenever this Digimon causes a deletion", () => {
    expect(compiled.effects[2]).toMatchObject({
      trigger: "OnDestroyedAnyone",
      isInherited: true,
      frequency: "OncePerTurn",
      condition: {
        kind: "allOf",
        conditions: [{ kind: "triggerDeleterIsSelf" }, { kind: "triggerDeletedMatchesFilter" }],
      },
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

  it("plays a qualifying card when the host deletes another Digimon by effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-061", as: "host", under: ["BT14-087"] }],
          hand: [{ card: "BT16-064", as: "dorugora" }],
          trash: [{ card: "BT16-051", as: "target" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("dorugora").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-051"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-051")).toBe(true);
  });

  it("does not trigger when a different friendly Digimon causes the deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-064", as: "host", under: ["BT16-061"] }],
          hand: [{ card: "BT13-011", as: "otherDeleter" }],
          trash: [{ card: "BT16-051", as: "target" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("otherDeleter").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => false, 50);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-051")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-051")).toBe(false);
  });

  it("does not trigger when the host deletes a Tamer rather than another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-061", as: "host", under: ["BT14-087"] }],
          hand: [{ card: "BT16-064", as: "dorugora" }],
          trash: [{ card: "BT16-051", as: "target" }],
        },
        1: { battleArea: [{ card: "BT1-087", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("dorugora").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => false, 50);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT16-051")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-051")).toBe(false);
  });
});
