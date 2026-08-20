import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-060.js";

describe("BT14-060", () => {
  it("is treated as Commandramon and reveals three to play a low-cost D-Brigade or DigiPolice Digimon when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({ actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Commandramon"] }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ to: "play", optional: true, filter: { playCostLte: 3 } }] });
  });
  it("inherits once-per-turn leave-play prevention by deleting another D-Brigade Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", cost: { kind: "deleteOwn" } }] }));
});
