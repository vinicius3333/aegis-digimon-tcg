import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./ST19-02.js";

describe("ST19-02 ＜Barrier＞ is once per turn", () => {
  it("uses the catalogued Junkmon Puppet identity", () => {
    expect(getCardDefinition("ST19-02")).toMatchObject({
      nameEn: "Junkmon",
      types: ["Puppet"],
      effectText: expect.stringContaining("Decoy ([Puppet] trait)"),
      inheritedEffectText: "＜Barrier＞.",
    });
  });

  it("prevents the first battle deletion but not the second in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          battleArea: [
            { card: "BT1-009", as: "first", dp: 5000 },
            { card: "BT1-009", as: "second", dp: 5000 },
          ],
        },
        1: {
          deck: Array.from({ length: 10 }, () => "BT1-009"),
          // Use a neutral host: ST19-10 also has Armor Purge, which spends security
          // during battle and changes this Barrier-only lifecycle assertion.
          battleArea: [{ card: "BT1-009", as: "barrier", dp: 1000, suspended: true, under: ["ST19-02"] }],
          security: ["BT1-085", "BT1-085"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "permanent", permanentId: s.perm("barrier").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision);
    expect(
      s.engine.applyIntent(1, {
        type: "respondBarrier",
        permanentId: s.perm("barrier").permanentId,
        accept: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    await settle(
      () =>
        s.perm("first").isSuspended &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("barrier").permanentId),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(mainPhase.isOpen).toBe(true);

    s.events.length = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "permanent", permanentId: s.perm("barrier").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    if (mainPhase.isOpen) expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
  });

  it("uses Decoy to sacrifice its host and preserve another Puppet from an effect deletion", async () => {
    const s = setupEngine(
      {
        0: {},
        1: {
          battleArea: [
            { card: "ST19-02", as: "decoy", dp: 7000 },
            { card: "ST19-04", as: "puppet", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(0, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("puppet").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "ST19-02"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-04")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST19-02")).toBe(true);
  });
});
