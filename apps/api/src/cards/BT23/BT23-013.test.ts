import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-013.js";

describe("BT23-013 Jesmon", () => {
  it("declares Rush and Alliance", () => {
    const keywords = compiled.effects.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords);
    expect(keywords).toEqual([
      { keyword: "Rush", raw: "＜Rush＞" },
      { keyword: "Alliance", raw: "＜Alliance＞" },
    ]);
  });

  it("offers the token/Sistermon modal on both timings", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({ kind: "RestrictEffect", scope: "thisEffect" });
      expect(actions[1]).toMatchObject({ kind: "Modal", optional: true, options: expect.any(Array) });
      expect(actions[1].options[0][0]).toMatchObject({
        kind: "PlayToken",
        token: {
          name: "Atho, René & Por",
          dp: 6000,
          color: "White",
          keywords: [
            { keyword: "Reboot" },
            { keyword: "Blocker" },
            { keyword: "Decoy", colors: ["Red", "Black"] },
          ],
        },
      });
      expect(actions[1].options[1][0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand", "trash"],
        payCost: false,
      });
    }
  });

  it("attacks once per turn when another of your Digimon is played", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
      actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true }, optional: true }],
    });
  });
});
