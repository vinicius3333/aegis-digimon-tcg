import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-047.js";

describe("BT15-047", () => {
  it("makes this suspended Digimon immune to opponent Digimon effects", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } }] }));
  it("gains 1 memory once per turn when an inherited Digimon deletes in battle", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle" }] }));
});
