import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-036.js";

describe("EX6-036 Kurisarimon", () => {
  it("reveals three for Diaboromon text and Unidentified cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }], rest: "trash" }));
  it("inherits optional Diaboromon token play on deletion when it had Unidentified", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "PlayToken", tokens: ["Diaboromon"], count: 1, optional: true, condition: { kind: "selfHasTrait" } }] }));
});
