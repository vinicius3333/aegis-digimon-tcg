import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-024.js";

describe("EX8-024", () => {
  it("unsuspends one of your Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Unsuspend", target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Unsuspend", target: { count: 1 } });
  });
  it("inherits a once-per-turn attack unsuspend by placing another Digimon underneath", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", cost: { kind: "place", destination: "digivolutionStack", position: "bottom" }, optional: true }] }));
});
