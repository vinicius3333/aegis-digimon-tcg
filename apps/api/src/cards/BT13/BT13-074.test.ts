import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
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
});
