import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT18-100.js";

describe("BT18-100 Gospel of the Fallen Angel", () => {
  it("covers the breeding digivolution, Delay, and Security placement clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlaceInBattleAreaSelf" }],
      }),
    );
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          optional: true,
          from: ["trash"],
          payCost: false,
          target: { filter: { zone: "breedingArea", controller: "mine" }, targetBreeding: true },
          into: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses Q3052's placed-Option boundary and the printed reduced-cost payment", () => {
    const delay = compiled.effects.find((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Trash",
          target: { filter: { controller: "opponent", kind: ["Option"] } },
          cost: {
            kind: "digivolve",
            from: ["trash"],
            costReduction: 3,
            into: { nameOrTrait: [{ tokens: ["Lucemon"], match: "name" }] },
          },
        },
      ],
    });
  });

  it("naturally digivolves the breeding-area Digimon from trash and places this Option", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-006", as: "egg" },
          hand: [{ card: "BT18-100", as: "option" }],
          trash: [{ card: "BT18-034", as: "lucemon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("lucemon").instanceId);

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(s.inst("lucemon").instanceId);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("naturally pays Delay by digivolving a Lucemon-name Digimon from trash, then trashes an opponent Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-082", as: "base" }, { card: "BT18-100", as: "option" }],
          trash: [{ card: "BT19-043", as: "destination" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT18-099", as: "opponentOption" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const delay = observe(s.engine)
      .activatableEffects(s.perm("option"))
      .find((entry) => (entry as { description?: string }).description?.includes("Delay")) as
      | { effectKey: string }
      | undefined;
    expect(delay?.effectKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        permanentId: s.perm("option").permanentId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.instanceId === s.inst("destination").instanceId &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentOption").instanceId),
    );

    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("destination").instanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("opponentOption").instanceId)).toBe(true);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("naturally places itself from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT18-100", as: "option" }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("option").instanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
