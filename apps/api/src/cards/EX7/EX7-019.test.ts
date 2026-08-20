import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-019.js";

describe("EX7-019 Sorcermon", () => {
  it("has Blocker, grants Ice-Snow, and unsuspends when the opponent has no stacked Digimon", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Unsuspend", condition: { kind: "opponentHasNone" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] });
  });
  it("inherits once-per-turn top evolution trash", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }] }));
});
