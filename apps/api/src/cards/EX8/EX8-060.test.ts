import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-060.js";

describe("EX8-060", () => {
  it("plays an NSo Digimon costing 3 or less from trash when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { playCostLte: 3 } },
    }));
  it("DNA digivolves into NSo and may attack after an NSo is played or digivolves during your turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [{ kind: "DnaDigivolve" }, { kind: "Attack", optional: true }],
    });
    expect(actions[1]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
  });
  it("contains only the printed effects", () => expect(compiled.effects).toHaveLength(2));
});
