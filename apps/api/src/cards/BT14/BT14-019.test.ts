import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-019.js";

describe("BT14-019", () => {
  it("preserves Otamamon's catalog identity and exact inherited watcher IR", () => {
    expect(getCardDefinition("BT14-019")).toMatchObject({
      nameEn: "Otamamon",
      colors: ["Blue"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
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

  it("arms only on the opponent's turn from a realistic blue evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT14-024",
            as: "gekomon",
            under: ["BT14-002", { card: "BT14-019", as: "otamamon" }],
          },
        ],
      },
    });
    await advance(s.engine).recompute();
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("gekomon").permanentId)).toHaveLength(0);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("gekomon").permanentId)).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("trashes exactly the bottom 2 sources of the first attacker and only once that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT14-024",
              as: "gekomon",
              under: ["BT14-002", { card: "BT14-019", as: "otamamon" }],
            },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            {
              card: "BT14-017",
              as: "first",
              under: [
                { card: "BT14-001", as: "firstBottom" },
                { card: "BT14-007", as: "firstSecond" },
                "BT14-012",
                "BT14-015",
              ],
            },
            {
              card: "BT14-016",
              as: "second",
              under: ["BT14-001", "BT14-007", "BT14-012"],
            },
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
      expect.arrayContaining([s.inst("firstBottom").instanceId, s.inst("firstSecond").instanceId]),
    );

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.perm("second").stack.map((card) => card.cardId)).toEqual(["BT14-001", "BT14-007", "BT14-012"]);
    assertNoLoudGap(s);
  });

  it("does as much as possible when the attacker has only 1 digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT14-024",
            as: "gekomon",
            under: ["BT14-002", { card: "BT14-019", as: "otamamon" }],
          },
        ],
        security: ["BT1-001", "BT1-001"],
      },
      1: { battleArea: [{ card: "BT14-016", as: "attacker", under: ["BT14-012"] }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await advance(s.engine).recompute();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT14-012");
    assertNoLoudGap(s);
  });
});
