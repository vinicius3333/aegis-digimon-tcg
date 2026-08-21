import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-031.js";

describe("BT17-031", () => {
  it("reveals three and adds a Kyubimon/Taomon/Sakuyamon or Rika Nonaka option", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand" }, { count: 1, to: "hand", orFilters: [{ kind: ["Option"], playCostGte: 2 }] }] }] });
  });

  it("gives an opposing Digimon Security Attack -1 after a cost 2+ option as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOptionUsed", fireCondition: { kind: "triggerOptionCostAtLeast", value: 2 }, actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" }] }] });
  });
});
