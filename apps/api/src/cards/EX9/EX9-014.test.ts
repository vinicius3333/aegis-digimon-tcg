import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-014.js";

describe("EX9-014", () => {
  it("reveals 3 for a DM and Ver.2 card, placing the latter under a DM Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "placeUnder" }], rest: "deckBottom" }));
  it("inherits Jamming", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" }));
});
