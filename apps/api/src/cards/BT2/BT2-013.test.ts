import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-013.js";

describe("BT2-013 Growlmon", () => {
  it("reaches a legal red level-5 stack and its inherited delete remains active", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: "BT2-013", as: "growlmon" },
            { card: "BT2-016", as: "lavogaritamon" },
          ],
          deck: [
            { card: "BT1-010", as: "drawAfterGrowlmon" },
            { card: "BT1-011", as: "drawAfterLavogaritamon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-029", as: "target", dp: 2000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("growlmon").instanceId);

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lavogaritamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("lavogaritamon").instanceId);

    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT2-013"]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-029");
  });

  it("deletes exactly 1 opposing Digimon at the 2000 DP boundary when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-016", as: "attacker", under: ["BT1-009", "BT2-013"] }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 2000 },
            { card: "BT1-011", as: "other", dp: 2000 },
          ],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT1-010")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("other").permanentId);
  });

  it("does not delete an opposing 3000 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-016", as: "attacker", under: ["BT1-009", "BT2-013"] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("allows the attack to resolve when there is no deletion target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-016", as: "attacker", under: ["BT1-009", "BT2-013"] }],
        },
        1: { security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    assertNoLoudGap(s);
  });
});
