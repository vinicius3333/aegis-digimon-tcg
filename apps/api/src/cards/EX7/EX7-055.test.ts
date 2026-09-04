import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-055.js";

describe("EX7-055", () => {
  it("plays Yuuki from hand when digivolving with one or fewer Tamers", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "battleArea",
        filter: { kind: ["Tamer"] },
        op: "lte",
        value: 1,
      },
    }));
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));

  it("publicly plays the exact Yuuki card when the Tamer limit is met", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX7-055", as: "punk" }], hand: [{ card: "EX7-065", as: "yuuki" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("punk"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-065"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-065")).toBe(true);
  });

  it("does not play Yuuki when two Tamers already occupy the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-055", as: "punk" },
            { card: "BT14-086", as: "first" },
            { card: "BT14-087", as: "second" },
          ],
          hand: [{ card: "EX7-065", as: "yuuki" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("punk"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yuuki").instanceId)).toBe(true);
  });

  it("counts Tamers rather than other cards in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-055", as: "punk" },
            { card: "BT1-009", as: "digimon" },
            { card: "BT14-086", as: "tamer" },
          ],
          hand: [{ card: "EX7-065", as: "yuuki" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("punk"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-065"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-065")).toBe(true);
  });

  it("publicly applies its inherited +2000 DP during your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-042", as: "host", under: ["EX7-055"], dp: 4000 }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
    expect(observe(s.engine).effectiveNames(s.perm("host"))).toContain("jazardmon");
  });
});
