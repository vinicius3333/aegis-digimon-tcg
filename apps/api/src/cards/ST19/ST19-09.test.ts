import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-09.js";

describe("ST19-09 Pandamon", () => {
  it("plays a level 3 Puppet Digimon from hand without cost on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 5000 }] },
        1: {
          battleArea: [{ card: "ST19-09", as: "panda", dp: 1000, suspended: true }],
          hand: [{ card: "ST19-02", as: "puppet" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("panda").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-02"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-02")).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("puppet").instanceId)).toBe(false);
  });

  it("matches the printed Blocker and deletion text", () => {
    expect(getCardDefinition("ST19-09")).toMatchObject({
      effectText: expect.stringContaining("＜Blocker＞"),
    });
  });

  it("does not play a level or trait mismatch from hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 5000 }] },
        1: {
          battleArea: [{ card: "ST19-09", as: "panda", dp: 1000, suspended: true }],
          hand: [
            { card: "ST19-07", as: "tooHigh" },
            { card: "BT1-010", as: "wrongTrait" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("panda"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("panda").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "ST19-09"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tooHigh").instanceId, s.inst("wrongTrait").instanceId]),
    );
  });

  it("may decline the optional On Deletion play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 5000 }] },
        1: {
          battleArea: [{ card: "ST19-09", as: "panda", dp: 1000, suspended: true }],
          hand: [{ card: "ST19-02", as: "puppet" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("panda").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST19-09"));
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST19-09")).toBe(true);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("puppet").instanceId)).toBe(true);
  });
});
