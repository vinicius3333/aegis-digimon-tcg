import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-074.js";

describe("BT13-074 PrinceMamemon", () => {
  it("uses reveal-play clauses and continuous Jamming/Reboot auras", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [
              {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  playCostLte: 10,
                  nameOrTrait: [{ match: "name", tokens: ["Mamemon"] }],
                },
                count: 1,
                to: "play",
                optional: true,
              },
            ],
            rest: "trash",
          },
        ],
      });
    }
    expect(compiled.effects[0]?.trigger).toBe("OnPlay");
    expect(compiled.effects[1]?.trigger).toBe("WhenDigivolving");
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { match: "name", tokens: ["Mamemon"] },
                { match: "trait", tokens: ["Royal Knight"] },
              ],
            },
            count: "all",
          },
          effect: { kind: "keyword", keyword: { keyword: "Jamming", raw: "＜Jamming＞" } },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { match: "name", tokens: ["Mamemon"] },
                { match: "trait", tokens: ["Royal Knight"] },
              ],
            },
            count: "all",
          },
          effect: { kind: "keyword", keyword: { keyword: "Reboot", raw: "＜Reboot＞" } },
        },
      ],
    });
  });

  it("grants Jamming and Reboot to Mamemon and Royal Knight Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-074", as: "prince" },
          { card: "BT11-068", as: "mamemon" },
          { card: "BT13-075", as: "alphamon" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("mamemon"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("mamemon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("alphamon"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("alphamon"), "Reboot")).toBe(true);
  });

  it("reveals and plays a qualifying Mamemon while trashing the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-074", as: "prince" }],
          deck: ["BT11-068", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("prince").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT11-068") &&
        s.state.players[0]!.trash.length === 2,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT11-068")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.memory).toBe(0);
  });
});
