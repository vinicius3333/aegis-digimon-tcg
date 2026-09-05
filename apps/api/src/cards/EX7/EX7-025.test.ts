import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-025.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-025 ShoeShoemon", () => {
  it("plays Arisa from hand on digivolving when you have one or fewer Tamers", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "zoneCount", op: "lte", value: 1, zone: "battleArea" },
    }));
  it("inherits permanent -3000 DP to opposing Security Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifySecurityDP",
      amount: -3000,
      duration: "permanent",
    }));

  it("plays Arisa from hand when I have no Tamers", async () => {
    const s = setupEngine(
      { 0: { hand: ["EX7-063"], battleArea: [{ card: "EX7-025", as: "shoe" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoe"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-063"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-063")).toBe(true);
  });

  it("does not play Arisa when more than one Tamer is present", async () => {
    const s = setupEngine({
      0: {
        hand: ["EX7-063"],
        battleArea: [
          { card: "EX7-025", as: "shoe" },
          { card: "EX7-063", as: "tamer" },
          { card: "EX7-063", as: "tamer2" },
        ],
      },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoe"));
    await settle(() => false, 20);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-063");
  });

  it("reduces opposing Security Digimon by 3000 DP through the inherited ledger", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", under: ["EX7-025"] }] },
      1: { security: ["BT1-010"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });
});
