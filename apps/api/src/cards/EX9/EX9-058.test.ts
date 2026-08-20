import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-058.js";

describe("EX9-058", () => {
  it("reveals three and adds a DM card and places a Ver.5 card under a DM Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand" }, { to: "placeUnder" }] }));
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Retaliation", raw: "＜Retaliation＞" }));
});
