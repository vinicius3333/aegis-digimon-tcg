import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-023.js";

describe("EX4-023 Agumon Expert", () => {
  it("once per opponent turn reveals a same-level card from hand and places it as security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true, source: { filter: { zone: "hand", controller: "mine", level: "same" } }, cost: { kind: "reveal", target: { filter: { zone: "hand", controller: "mine", level: "same" } } } }] });
  });
});
