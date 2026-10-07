import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-034.js";

describe("BT14-034", () => {
  it("preserves Sukamon's catalog identity and complete IR", () => {
    expect(getCardDefinition("BT14-034")).toMatchObject({
      nameEn: "Sukamon",
      colors: ["Yellow", "Black"],
      level: 4,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 2 },
        { color: "Black", level: 3, memoryCost: 2 },
      ],
      attributes: ["Virus"],
      types: ["Abnormal"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("battles as Security Digimon before playing itself at end of battle for no cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-031", as: "attacker", dp: 500 }] },
      1: { security: [{ card: "BT14-034", as: "sukamon" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-034"));
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT14-031");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    const checked = s.events.findIndex((event) => event.kind === "securityChecked");
    const played = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT14-034");
    expect(checked).toBeGreaterThanOrEqual(0);
    expect(played).toBeGreaterThan(checked);
    assertNoLoudGap(s);
  });

  it("inherits -3000 DP from a legal Chuumon to Sukamon stack when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-032", as: "base" }], hand: [{ card: "BT14-034", as: "sukamon" }] },
        1: { battleArea: [{ card: "BT14-026", as: "target", dp: 8000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sukamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-034");
    expect(s.state.memory).toBe(3);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });

  it.each([false, true])(
    "#5261 plays Sukamon against the reported GraceNovamon stack (Apollomon reduction=%s)",
    async (reduction) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT25-103",
                as: "grace",
                under: [
                  "BT25-001",
                  "P-198",
                  "BT25-022",
                  "BT25-024",
                  "BT25-026",
                  "BT25-028",
                  "BT25-008",
                  "BT25-013",
                  "BT25-017",
                  "BT25-018",
                ],
              },
            ],
            hand: [{ card: "BT25-018", as: "apollomon" }, { card: "BT1-009" }],
          },
          1: { security: [{ card: "BT14-034", as: "sukamon" }, { card: "EX5-054" }, { card: "BT11-036" }] },
        },
        { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 20;
      if (reduction) {
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apollomon").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
      }
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("grace").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      const played = s.events.findIndex((e) => e.kind === "cardPlayed" && e.cardId === "BT14-034");
      expect(played).toBeGreaterThan(
        s.events.findIndex((e) => e.kind === "securityChecked" && e.revealedCardId === "BT14-034"),
      );
      expect(played).toBeGreaterThanOrEqual(0);
      const sukamon = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT14-034");
      if (reduction) {
        expect(sukamon).toBeUndefined();
        expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("sukamon").instanceId)).toBe(true);
        expect(
          s.events
            .slice(played + 1)
            .some((e) => e.kind === "cardsMoved" && e.deletedPermanents?.some((p) => p.cardId === "BT14-034")),
        ).toBe(true);
      } else {
        expect(sukamon?.currentDP).toBe(1000);
      }
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    },
  );
});
