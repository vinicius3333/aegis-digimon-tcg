import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-025.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-025 ShoeShoemon", () => {
  it("plays Arisa from hand on digivolving when you have one or fewer Tamers", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "zoneCount", op: "lte", value: 1, zone: "battleArea" } }));
  it("inherits permanent -3000 DP to all opposing Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "permanent", target: { count: "all" } }));

  it("plays Arisa from hand when I have no Tamers", async () => {
    const s = setupEngine({ 0: { hand: ["EX7-063"], battleArea: [{ card: "EX7-025", as: "shoe" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoe"));
    await settle(() => s.state.players[0].battleArea.some((permanent) => permanent.topCard.cardId === "EX7-063"));
    expect(s.state.players[0].battleArea.some((permanent) => permanent.topCard.cardId === "EX7-063")).toBe(true);
  });
});
