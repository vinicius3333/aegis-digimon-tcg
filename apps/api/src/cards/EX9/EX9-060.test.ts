import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-060.js";

describe("EX9-060", () => {
  it("has Training and once per turn draws one by placing a hand card underneath on digivolution or attack", () => {
    expect(compiled.effects?.find((entry) => entry.keywords?.some((keyword) => keyword.keyword === "Training"))?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] });
  });
  it("inherits deletion of an opposing level-four-or-lower Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }] }));
  it("shares the once-per-turn identity and exact hand placement cost across both triggers", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ optional: true, abortOnDecline: true, cost: { target: { filter: { zone: "hand", controller: "mine" }, count: 1 }, destination: "digivolutionStack", position: "bottom", host: "self", faceDown: true } });
    expect(compiled.effects?.filter((entry) => ["WhenDigivolving", "WhenAttacking"].includes(entry.trigger)).map((entry) => entry.sharedUseKey)).toEqual(["ir-shared-0", "ir-shared-0"]);
  });
});
