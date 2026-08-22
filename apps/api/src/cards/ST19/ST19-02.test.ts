import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../AD1/AD1-008.js";
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
          battleArea: [
            { card: "BT1-009", as: "first", dp: 5000 },
            { card: "BT1-009", as: "second", dp: 5000 },
          ],
        },
        1: {
          battleArea: [{ card: "ST19-10", as: "barrier", dp: 1000, suspended: true, under: ["ST19-02"] }],
          security: 10,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "permanent", permanentId: s.perm("barrier").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    await settle(
      () =>
        s.perm("first").isSuspended &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("barrier").permanentId),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    s.state.phase = "Main" as never;
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
  });

  it("uses Decoy to sacrifice its host and preserve another Puppet from an effect deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-014", as: "base" }], hand: [{ card: "AD1-008", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "ST19-02", as: "decoy", dp: 7000 },
            { card: "ST19-04", as: "puppet", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "ST19-02"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-04")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST19-02")).toBe(true);
  });
});
