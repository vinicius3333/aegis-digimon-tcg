import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-025.js";

describe("EX6-025 Sagomon", () => {
  it("during DigiXros grants Security Attack -1 and reveals four named cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, optional: true }, { kind: "RevealAdd", revealCount: 4, condition: { kind: "digiXrosCount", minimum: 1 }, rest: "deckBottom" }]);
  });
  it("returns a yellow digivolution card when leaving play and inherits Security Attack -1", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Replacement", actions: [{ kind: "Return", to: "hand", target: { filter: { zone: "digivolutionCards", colors: ["Yellow"] } } }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } });
  });
});
