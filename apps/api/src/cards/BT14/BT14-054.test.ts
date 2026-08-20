import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-054.js";

describe("BT14-054", () => {
  it("has Piercing and suspends an opposing Digimon by unsuspending itself on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ keywords: [{ keyword: "Piercing" }], actions: [{ kind: "Suspend", cost: { kind: "unsuspend", target: { isSelf: true } } }] }));
  it("attacks an opposing Digimon at end of your turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({ kind: "Attack", attackPlayer: false, target: { filter: { controller: "opponent" } } }));
});
