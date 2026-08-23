import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-049.js";
import "./index.js";

describe("BT17-049 Antylamon", () => {
  it("has Alliance and plays one level-3 green or yellow Digimon from trash when digivolving", () => {
    expect(compiled.effects.some((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Alliance"))).toBe(
      true,
    );
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow", "Green"], levels: [3] }, count: 1 },
    });
  });

  it("once per turn deletes another suspended Digimon to play a level-3 Beast from trash", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          target: { filter: { controller: "mine", levels: [3], nameOrTrait: [{ tokens: ["Beast"], match: "trait" }] } },
          cost: {
            kind: "deleteOwn",
            target: { filter: { controller: "mine", excludeSelf: true, suspended: true, kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
  });

  it("uses the named evolution route and plays a level-3 green Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-025", as: "turuiemon" }],
          hand: [{ card: "BT17-049", as: "antylamon" }],
          trash: [{ card: "BT17-043", as: "terriermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const terriermonId = s.inst("terriermon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("turuiemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === terriermonId),
    );

    expect(observe(s.engine).hasKeyword(s.perm("turuiemon"), "Alliance")).toBe(true);
  });

  it("deletes and then replays the same suspended level-3 Beast after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-050", under: ["BT17-049"], as: "host" },
            { card: "BT17-043", suspended: true, as: "costBeast" },
          ],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const beastId = s.perm("costBeast").topCard!.instanceId;
    const costPermanentId = s.perm("costBeast").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === beastId && permanent.permanentId !== costPermanentId,
      ),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === beastId)).toBe(false);
  });
});
