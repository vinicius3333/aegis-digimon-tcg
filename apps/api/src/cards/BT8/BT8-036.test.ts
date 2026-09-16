import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-036.js";

const BT8_036 = "BT8-036";
const BLUE_DIGIMON = "BT1-030";

describe("BT8-036 Ankylomon ＜when played＞ cost reduction (blue Digimon in play → -1, automatic)", () => {
  it("plays at cost 3 (4 - 1) with a blue Digimon in play, no prompt required", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: BLUE_DIGIMON, dp: 3000 }],
        hand: [{ card: BT8_036, as: "card" }],
      },
    });
    const p0 = s.state.players[0]!;
    s.state.memory = 3;

    const card = s.inst("card");
    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BT8_036) && s.state.memory === 0, 400);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === BT8_036)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("plays at the full cost (4) with NO blue Digimon in play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: BT8_036, as: "card" }] } });
    const p0 = s.state.players[0]!;
    s.state.memory = 4;

    const card = s.inst("card");
    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BT8_036) && s.state.memory === 0, 400);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === BT8_036)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not reduce another card's play cost with a blue Digimon in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: BLUE_DIGIMON, dp: 3000 }],
        hand: [{ card: "BT8-034", as: "other" }],
      },
    });
    const p0 = s.state.players[0]!;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.some((p) => p.topCard?.instanceId === s.inst("other").instanceId));

    expect(s.state.memory).toBe(0);
  });

  it("applies the inherited -3000 DP effect when a blue Digimon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-041", as: "host", under: ["BT8-034", "BT8-036"] },
          { card: BLUE_DIGIMON, as: "blueAlly" },
        ],
      },
      1: {
        battleArea: [{ card: "BT2-047", as: "target", dp: 6000 }],
        security: ["BT1-001"],
      },
    });

    const target = s.perm("target");
    const targetDP = target.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === targetDP - 3000);

    expect(target.currentDP).toBe(targetDP - 3000);
  });
});
