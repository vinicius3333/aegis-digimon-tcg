import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-035.js";

describe("EX5-035 Hawkmon", () => {
  it("reveals three and adds all revealed Digimon with Fortitude", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: "all", filter: { kind: ["Digimon"], keywords: ["Fortitude"] } }] });
  });
  it("gets 1000 DP while suspended as an inherited effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }] });
  });
});
