import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-045.js";

describe("EX8-045", () => {
  it("suspends an opposing Digimon or Tamer and returns an opposing suspended Tamer to the bottom of the deck when digivolving", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Suspend", target: { count: 1 } }, { kind: "Return", to: "deckBottom", target: { count: 1 } }]));
  it("gains +1000 DP per your Digimon color and conditionally gains Piercing and Security Attack +1", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: 1000, scaling: { per: 1, unit: "colors" } });
    expect(actions[1]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } }, while: { kind: "opponentHasNone" } });
    expect(actions[2]).toMatchObject({ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } } });
  });
});
