import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-063.js";

describe("P-063 Ruli Tsukiyono", () => {
  it("suspends to give +3000 DP to an attacker with Angoramon in its sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-063", as: "ruli" },
          { card: "BT10-051", as: "attacker", under: ["P-060"] },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    const printedDP = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const prompt = s.decisions.at(-1)!.req;
    expect(prompt.sourceCardId).toBe("P-063");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ruli").isSuspended);
    await settle();

    expect(s.perm("attacker").currentDP).toBe(printedDP + 3000);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "P-063")).toHaveLength(1);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-063", as: "ruli" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    const ruliId = s.inst("ruli").instanceId;
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === ruliId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === ruliId)).toBe(true);
  });

  it("does not grant +3000 DP when Ruli is already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-063", as: "ruli", suspended: true },
            { card: "BT10-051", as: "attacker", under: ["P-060"] },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true },
    );
    const printedDP = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("attacker").currentDP).toBe(printedDP);
  });

  it("does not treat SymbareAngoramon as the exact Angoramon source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-063", as: "ruli" },
            { card: "BT10-054", as: "attacker", under: ["BT10-051"] },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true },
    );
    const printedDP = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("ruli").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(printedDP);
  });
});
