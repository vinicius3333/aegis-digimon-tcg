import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-070.js";

describe("EX6-070 Phantom Pain", () => {
  it("arms Delay at opponent end turn and exposes its optional delayed deletion", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("PlaceInBattleAreaSelf");
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Delay" } });
    expect(compiled.effects?.filter((entry) => entry.trigger === "Main").at(-1)).toMatchObject({ keywords: [{ keyword: "Delay" }], actions: [{ kind: "Delete", optional: true, target: { filter: { unsuspended: true } }, cost: { kind: "deleteOwn" } }] });
  });
});
