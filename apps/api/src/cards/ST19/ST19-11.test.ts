import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST19-12.js";
import "./ST19-11.js";

describe("ST19-11 Chaperomon", () => {
  it("reduces one opposing Digimon by 3000 with fewer than three total Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST19-11", as: "chap" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 7000 }] },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chap").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("reduces the same target by 6000 when both players have three total Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST19-11", as: "chap" }], battleArea: [{ card: "BT1-010", as: "ally" }] },
      1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chap").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("matches the KB-defined inherited replacement clause", () => {
    expect(getCardDefinition("ST19-11")).toMatchObject({
      inheritedEffectText: expect.stringContaining("When this Digimon would leave the battle area"),
    });
  });

  it("pays the inherited leave-play replacement with a Token and preserves Chaperomon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // ST19-11's replacement is inherited: it must be beneath a host Digimon.
            { card: "BT1-010", as: "chap", under: ["ST19-11"] },
            { card: "TOKEN-Familiar-Token", as: "fodder", dp: 3000 },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    s.state.turnSeat = 1;
    await s.ready();
    // No public intent isolates an arbitrary opponent-effect deletion without adding
    // another card's targeting behavior, so use the production deletion verb directly.
    expect(await advance(s.engine).verb.deletePermanent([s.perm("chap").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(true);
    await settle(
      () => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Familiar-Token"),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Familiar-Token"),
    ).toBe(false);
  });
});
