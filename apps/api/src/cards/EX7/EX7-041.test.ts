import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-041.js";

describe("EX7-041", () => {
  it("has Blocker and protects itself from effect deletion during the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "protection", tokens: ["beDeletedByEffects"] });
  });
  it("inherits Reboot", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Reboot", raw: "＜Reboot＞" }));
});
