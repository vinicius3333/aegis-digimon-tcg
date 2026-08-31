import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-08 MegaGargomon", () => {
  it("has Blocker and Reboot and suspends and restricts two opposing Digimon/Tamers", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-07", as: "base" }], hand: [{ card: "ST17-08", as: "mega" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentDigimon" },
            { card: "ST17-10", as: "opponentTamer" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(false);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mega").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "ST17-08" && s.perm("opponentDigimon").isSuspended);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);

    expect(s.perm("opponentDigimon").isSuspended).toBe(true);
    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "digivolve")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "digivolve")).toBe(true);
  });

  it("unsuspends itself through the shared once-per-turn When Digivolving/End of Attack effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-08", as: "mega" }] },
        1: { security: ["BT1-090"], battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("mega").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("mega").isSuspended);
    expect(s.perm("mega").isSuspended).toBe(false);
  });
});
