import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-038.js";
import "./BT5-065.js";

describe("BT5-038 Kyubimon", () => {
  it("gives all opposing Security Digimon -1000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-039", as: "host", under: ["BT5-038"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-1000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("does not apply the inherited security reduction on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-039", as: "host", under: ["BT5-038"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });

  it("Q1322: a Security Digimon reduced to 0 DP still battles", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "attacker", under: ["BT5-038"] }] },
      1: { security: [{ card: "BT1-011", as: "securityDigimon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    const checked = s.events.find((event) => event.kind === "securityChecked");
    expect(checked).toMatchObject({
      kind: "securityChecked",
      revealedCardId: "BT1-011",
      resolution: "battle",
    });
  });

  it("Q1323-Q1324: a Security effect resolves, then the played card is no longer reduced", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-041", as: "attacker", under: ["BT5-038"] }] },
      1: { security: [{ card: "BT5-065", as: "securityDigimon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT5-065"));

    const played = s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === "BT5-065");
    expect(played).toBeDefined();
    // Q1324: the -1000 modifier is scoped to Security Digimon, not the owner's
    // battle area, so the newly played permanent keeps its printed DP.
    expect(played!.currentDP).toBe(5000);
  });
});
