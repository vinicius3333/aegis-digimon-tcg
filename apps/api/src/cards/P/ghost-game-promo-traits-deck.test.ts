import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-059.js";
import "./P-060.js";
import "./P-061.js";
import "./P-062.js";
import "./P-063.js";
import "./P-064.js";

describe("Ghost Game promo trait decks", () => {
  it("resolves the Gammamon, Angoramon, and Jellymon source/Tamer pairs in one game", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-062", as: "hiro" },
            { card: "P-063", as: "ruli" },
            { card: "P-064", as: "kiyoshiro" },
            { card: "BT1-010", as: "gammamonHost", under: ["P-059"] },
            { card: "BT1-014", as: "angoramonHost", under: ["P-060"] },
            { card: "BT1-009", as: "jellymonHost", under: ["P-061"] },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "targetOne", suspended: true, dp: 1000 },
            { card: "BT1-009", as: "targetTwo", suspended: true, dp: 1000 },
            { card: "BT1-009", as: "targetThree", suspended: true, dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    const gammamonBaseDP = s.perm("gammamonHost").baseDP;
    const angoramonBaseDP = s.perm("angoramonHost").baseDP;
    const drawnId = s.inst("drawn").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(s.perm("gammamonHost").currentDP).toBe(gammamonBaseDP + 2000);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gammamonHost").permanentId,
      target: { kind: "permanent", permanentId: s.perm("targetOne").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.perm("hiro").isSuspended);
    await settle();
    expect(observe(s.engine).keywordAmount(s.perm("gammamonHost"), "SecurityAttack")).toBe(1);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("angoramonHost").permanentId,
      target: { kind: "permanent", permanentId: s.perm("targetTwo").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.perm("ruli").isSuspended && s.state.memory === 4);
    await settle();
    expect(s.perm("angoramonHost").currentDP).toBe(angoramonBaseDP + 3000);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("jellymonHost").permanentId,
      target: { kind: "permanent", permanentId: s.perm("targetThree").permanentId },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("kiyoshiro").isSuspended &&
      s.state.players[0]!.hand.some((card) => card.instanceId === drawnId) &&
      observe(s.engine).hasKeyword(s.perm("jellymonHost"), "Jamming"),
    );

    expect(observe(s.engine).hasKeyword(s.perm("jellymonHost"), "Jamming")).toBe(true);
  });
});
