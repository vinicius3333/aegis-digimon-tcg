import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-097.js";
import "./BT10-104.js";
import "./BT10-108.js";

describe("BT10-108 Death the Cannon", () => {
  it.each([
    { trashCount: 9, target: "BT10-112", deleted: false, label: "level 7 with fewer than 10 cards" },
    { trashCount: 10, target: "BT10-112", deleted: true, label: "level 7 with 10 cards" },
    { trashCount: 0, target: "BT10-043", deleted: true, label: "level 6 with fewer than 10 cards" },
  ])("handles $label in trash", async ({ trashCount, target, deleted }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-012"],
          hand: [{ card: "BT10-108", as: "option" }],
          trash: Array.from({ length: trashCount }, () => "BT1-001"),
        },
        1: { battleArea: [{ card: target, as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.perm("target").topCard.instanceId,
      ),
    ).toBe(!deleted);
  });

  it("returns to hand when another effect directly trashes it from the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-092", "BT10-093"],
          hand: [{ card: "BT10-104", as: "immortalRuler" }],
          deck: [{ card: "BT10-108", as: "deathCannon" }, "BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("immortalRuler").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("deathCannon").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("deathCannon").instanceId)).toBe(true);
  });

  it("does not return to hand when it is only revealed from the deck (Q2038)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-017"],
          hand: [{ card: "BT10-097", as: "revealer" }],
          deck: [{ card: "BT10-108", as: "deathCannon" }, "BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
      },
      { autoDeclineOptional: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    const deathCannonId = s.inst("deathCannon").instanceId;
    const revealerId = s.inst("revealer").instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("revealer").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === revealerId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === deathCannonId)).toBe(false);
    expect(s.state.players[0]!.deck.some(({ instanceId }) => instanceId === deathCannonId)).toBe(true);
  });

  it("Security activates the level-based Main effect", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT10-108", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT10-043", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
