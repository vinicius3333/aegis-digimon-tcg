import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST8-04.js";
import "./ST8-08.js";
import "./ST8-09.js";

describe("ST8-08 AeroVeedramon", () => {
  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST8-08", as: "aero" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("aero"), "Jamming")).toBe(true);
  });

  it("gives its host Security Attack +1 on your turn with 8 cards in hand", async () => {
    const s = setupEngine({
      0: { hand: Array(8).fill("ST8-02"), battleArea: [{ card: "ST8-10", as: "host", under: ["ST8-08"] }] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});

describe("ST8-08 AeroVeedramon — KB Q&A rulings", () => {
  async function attackAfterWhenAttackingDraw(startingHandSize: number) {
    const s = setupEngine({
      0: {
        hand: Array(startingHandSize).fill("ST8-02"),
        deck: ["ST8-03"],
        battleArea: [{ card: "ST8-09", as: "attacker", under: ["ST8-04", "ST8-08"] }],
      },
      1: { security: ["ST8-05", "ST8-05", "ST8-05"] },
    });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !observe(s.engine).isAttacking() && s.state.players[0]!.hand.length === startingHandSize + 1,
      3000,
    );
    return s;
  }

  it("gives <Security Attack +1> to an attack whose [When Attacking] <Draw 1> reached 8 cards in hand (Q702)", async () => {
    const reachedEight = await attackAfterWhenAttackingDraw(7);
    expect(reachedEight.state.players[1]!.security).toHaveLength(1);
    expect(reachedEight.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);

    const stayedAtSeven = await attackAfterWhenAttackingDraw(6);
    expect(stayedAtSeven.state.players[1]!.security).toHaveLength(2);
    expect(stayedAtSeven.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
  });
});
