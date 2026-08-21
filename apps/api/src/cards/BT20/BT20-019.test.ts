import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-019.js";

describe("BT20-019 Jesmon (X Antibody)", () => {
  it("keeps the post-condition attack independent and gates only the temporary immunity", () => {
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: { immuneToOpponentEffects: true }, duration: "forTheTurn", condition: { kind: "selfDigivolutionStackHasTrait" } });
    expect(whenDigivolving?.actions[1]).toMatchObject({ kind: "Attack", optional: true });
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(yourTurn).toMatchObject({ actions: [{ kind: "GainKeyword", target: { count: "all", filter: { nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }, { tokens: ["Royal Knight"], match: "trait" }] } } }, { kind: "GrantCanAttackUnsuspended", target: { count: "all" } }] });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ condition: { kind: "selfHasName", names: ["Jesmon GX"] } }, { condition: { kind: "selfHasName", names: ["Jesmon GX"] } }] });
  });
});
