import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST8-02.js";
import "./ST8-04.js";

describe("ST8-02 Gabumon", () => {
  it("gives its host +1000 DP on all turns while you have at least 8 cards in hand", async () => {
    const s = setupEngine({
      0: { hand: Array(8).fill("ST8-02"), battleArea: [{ card: "ST8-10", as: "host", under: ["ST8-02"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(13000);
  });
});

async function attackIntoEqualDpSecurity(handSize: number) {
  const s = setupEngine({
    0: {
      hand: Array.from({ length: handSize }, () => "ST8-03"),
      deck: [{ card: "ST8-03", as: "drawn" }, "ST8-03"],
      battleArea: [{ card: "ST8-05", as: "host", under: ["ST8-02", "ST8-04"] }],
    },
    1: { security: [{ card: "BT1-013", as: "securityDigimon" }, "ST8-03"] },
  });
  await s.ready();
  expect(s.perm("host").currentDP).toBe(5000);
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      !observe(s.engine).isAttacking() &&
      s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("securityDigimon").instanceId),
    3000,
  );
  return s;
}

describe("ST8-02 Gabumon — KB Q&A rulings", () => {
  it("gives +1000 DP for the rest of the attack once the [When Attacking] draw brings the hand to 8 (Q696)", async () => {
    const s = await attackIntoEqualDpSecurity(7);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.perm("host").currentDP).toBe(6000);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    const control = await attackIntoEqualDpSecurity(6);
    expect(control.state.players[0]!.hand).toHaveLength(7);
    expect(control.state.players[0]!.battleArea).toHaveLength(0);
  });
});
