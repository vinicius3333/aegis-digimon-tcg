import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-067.js";

describe("EX6-067 Dominimon", () => {
  it("unsuspends one Angel-family Digimon without Dominimon, or all with Dominimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "Unsuspend", target: { count: 1 }, condition: { kind: "youHaveNone" } }, { kind: "Unsuspend", target: { count: "all" }, condition: { kind: "youHave" } }]));
  it("recovers one and adds itself to hand from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } }, { kind: "AddToHandSelf" }]));
});
