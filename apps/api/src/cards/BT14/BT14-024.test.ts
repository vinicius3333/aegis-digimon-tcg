import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-024.js";

describe("BT14-024", () => {
  it("preserves Gekomon's catalog identity and exact inherited watcher IR", () => {
    expect(getCardDefinition("BT14-024")).toMatchObject({
      nameEn: "Gekomon",
      colors: ["Blue"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      attributes: ["Virus"],
      types: ["Amphibian"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OpponentsTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenOpponentAttacks",
              actions: [
                {
                  kind: "TrashDigivolution",
                  target: { sourceRef: "triggerSubject" },
                  amount: 2,
                  fromTop: false,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("arms only while inherited on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-026", as: "holder", under: ["BT14-002", "BT14-020", "BT14-024"] },
          { card: "BT14-024", as: "top" },
        ],
      },
    });
    await advance(s.engine).recompute();
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("holder").permanentId)).toHaveLength(0);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("holder").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("top").permanentId)).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("trashes the first attacker's bottom 2 sources and does not fire on a second attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-026", as: "holder", under: ["BT14-002", "BT14-020", "BT14-024"] }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            {
              card: "BT14-017",
              as: "first",
              under: [
                { card: "BT14-001", as: "bottom" },
                { card: "BT14-007", as: "secondBottom" },
                "BT14-012",
                "BT14-015",
              ],
            },
            { card: "BT14-016", as: "second", under: ["BT14-001", "BT14-007", "BT14-012"] },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await advance(s.engine).recompute();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").stack.length === 2);
    expect(s.perm("first").stack.map((card) => card.cardId)).toEqual(["BT14-012", "BT14-015"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, s.inst("secondBottom").instanceId]),
    );
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("second").stack).toHaveLength(3);
    assertNoLoudGap(s);
  });
});
