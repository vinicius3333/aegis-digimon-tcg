import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-017.js";

describe("EX8-017", () => {
  it("gives one of your Digimon Blocker until the end of the opponent's turn on play", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd", target: { count: 1 } }));
  it("inherits Jamming", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" }));
});
