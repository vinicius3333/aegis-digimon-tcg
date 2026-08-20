import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-036.js";

describe("EX7-036", () => {
  it("has Security Attack +1 and Vortex", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? [])).toEqual(expect.arrayContaining([{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }, { keyword: "Vortex", raw: "＜Vortex＞" }]));
  });
  it("bottom-decks one suspended opposing Digimon after suspending a Digimon on digivolving and attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Suspend" }, { kind: "Return", to: "deckBottom", condition: { kind: "ifThisEffectActed" } }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions).toMatchObject([{ kind: "Suspend" }, { kind: "Return", to: "deckBottom" }]);
  });
  it("has Bird Dragon as a rule trait", () => expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Bird Dragon"] }));
});
