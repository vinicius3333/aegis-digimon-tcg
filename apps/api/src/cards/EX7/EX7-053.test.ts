import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-053.js";

describe("EX7-053", () => {
  it("trashes a card from hand and may return an Evil, Dark Dragon, or Evil Dragon Digimon from trash", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Trash", target: { count: 1 } }, { kind: "Return", to: "hand", optional: true, target: { count: 1 } }]));
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Retaliation", raw: "＜Retaliation＞" }));
});
