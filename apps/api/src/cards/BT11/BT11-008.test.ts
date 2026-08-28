import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-008.js";

describe("BT11-008 Bearmon", () => {
  it("matches the catalog and carries the complete inherited contract", () => {
    expect(getCardDefinition("BT11-008")).toMatchObject({
      cardId: "BT11-008",
      nameEn: "Bearmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When this Digimon's attack target is switched, this Digimon gets +3000 DP for the turn.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenAttackTargetSwitched",
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                  amount: 3000,
                  duration: "forTheTurn",
                  condition: { kind: "triggerAttackerIsSelf" },
                },
              ],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gains +3000 before battle when Blocker switches its target (Q2053)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-008"], dp: 2000 }] },
      1: {
        battleArea: [{ card: "ST18-07", as: "blocker", dp: 4000 }],
        security: ["BT1-009"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("gives only its own host +3000 DP when that host's attack target is switched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT11-008"] },
          { card: "BT1-064", as: "other" },
        ],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before + 3000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").currentDP).toBe(before + 3000);
  });

  it("does not trigger when another Digimon's attack target is switched", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-064", as: "host", under: ["BT11-008"] },
          { card: "BT1-064", as: "other" },
        ],
      },
    });
    const before = s.perm("host").currentDP;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("other").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before);
  });

  it("does not trigger on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-008"] }] },
    });
    const before = s.perm("host").currentDP;
    s.state.turnSeat = 1;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").currentDP).toBe(before);
  });
});
