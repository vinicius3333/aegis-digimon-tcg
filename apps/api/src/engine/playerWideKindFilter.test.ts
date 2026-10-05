import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("player-wide Digimon kind filters (Discord 1556502418941018123)", () => {
  it("Heaven's Gate security boosts Digimon and Security DP while leaving Options and Tamers without DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-013", as: "digimon" },
          { card: "LM-051", as: "boost" },
          { card: "BT1-085", as: "tamer" },
        ],
        security: ["ST3-13"],
      },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 0 &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("digimon").currentDP).toBe(10_000);
    expect(observe(s.engine).securityDp(0)).toBe(5_000);
    expect(s.perm("boost").currentDP).toBe(0);
    expect(s.perm("tamer").currentDP).toBe(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("ST3-13");
  });

  it("Shadow Wing security grants Security Attack only to Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-013", as: "digimon" },
          { card: "LM-051", as: "boost" },
          { card: "BT1-085", as: "tamer" },
        ],
        security: ["ST1-13"],
      },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.security.length === 0 &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    expect(observe(s.engine).keywordAmount(s.perm("digimon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("boost"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("tamer"), "SecurityAttack")).toBe(0);
  });

  it("Magnadramon's opponent-wide Security Attack reduction excludes Options and Tamers", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX3-036", as: "magnadramon" }] },
      1: {
        battleArea: [
          { card: "BT1-013", as: "digimon" },
          { card: "LM-051", as: "boost" },
          { card: "BT1-085", as: "tamer" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnadramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-036") &&
        s.state.pendingDecision === undefined,
    );

    expect(observe(s.engine).keywordAmount(s.perm("digimon"), "SecurityAttack")).toBe(-1);
    expect(observe(s.engine).keywordAmount(s.perm("boost"), "SecurityAttack")).toBe(0);
    expect(observe(s.engine).keywordAmount(s.perm("tamer"), "SecurityAttack")).toBe(0);
  });
});
