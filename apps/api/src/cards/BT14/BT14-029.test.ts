import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-029.js";

describe("BT14-029", () => {
  it("trashes three opposing sources on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, target: { count: 3 } }));
  it("once per turn unsuspends when no opponent Digimon has more sources", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend", condition: { kind: "opponentHasNone" } }] }));
});
