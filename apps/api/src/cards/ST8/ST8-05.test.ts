import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST8-04.js";
import "./ST8-05.js";

describe("ST8-05 Veedramon", () => {
  it("returns an opposing level 3 and trashes its sources when its host attacks with 8 cards", async () => {
    const s = setupEngine(
      {
        0: { hand: Array(8).fill("ST8-02"), battleArea: [{ card: "ST8-07", as: "host", under: ["ST8-05"] }] },
        1: {
          battleArea: [{ card: "ST8-04", as: "target", under: [{ card: "ST8-01", as: "source" }] }],
          security: ["ST8-01"],
        },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard.instanceId;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});

async function attackWithDrawBeforeReturn(handSize: number) {
  const s = setupEngine(
    {
      0: {
        hand: Array.from({ length: handSize }, () => "ST8-03"),
        deck: [{ card: "ST8-03", as: "drawn" }, "ST8-03"],
        battleArea: [{ card: "ST8-07", as: "host", under: ["ST8-04", "ST8-05"] }],
      },
      1: {
        battleArea: [{ card: "ST8-04", as: "opposingRookie" }],
        security: ["ST8-03", "ST8-03"],
      },
    },
    { autoSelectCards: true, preferTriggerKeys: ["ST8-04"] },
  );
  await s.ready();
  const opposingRookieId = s.perm("opposingRookie").topCard.instanceId;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1, 3000);
  const returned = s.state.players[1]!.hand.some(({ instanceId }) => instanceId === opposingRookieId);
  return { s, returned };
}

describe("ST8-05 Veedramon — KB Q&A rulings", () => {
  it("returns an opposing level 3 when it resolves after another [When Attacking] draw brings the hand to 8 (Q698)", async () => {
    const eighthCardDrawn = await attackWithDrawBeforeReturn(7);
    expect(eighthCardDrawn.s.state.players[0]!.hand).toHaveLength(8);
    expect(eighthCardDrawn.returned).toBe(true);
    expect(eighthCardDrawn.s.state.players[1]!.battleArea).toHaveLength(0);

    const seventhCardDrawn = await attackWithDrawBeforeReturn(6);
    expect(seventhCardDrawn.s.state.players[0]!.hand).toHaveLength(7);
    expect(seventhCardDrawn.returned).toBe(false);
    expect(seventhCardDrawn.s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
