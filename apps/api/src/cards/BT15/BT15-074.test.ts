import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-074.js";

describe("BT15-074", () => {
  it("has Blocker and may trash an opponent's hand Digimon, otherwise gains memory", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({ kind: "Trash", controller: "opponent", optional: true });
    expect(compiled.effects?.[1]?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "ifThisEffectDidNotAct" } });
  });
  it("restricts attacks with no opposing Digimon and gains inherited memory when an opponent Digimon is played", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Aura", while: { kind: "opponentHasNone" } }] });
    expect(compiled.effects?.[4]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }] });
  });
});
