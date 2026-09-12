import { EffectDuration } from "@aegis/shared";
import { advance } from "../testkit/advance.js";
import { describe, expect, it } from "vitest";
import { observe } from "../testkit/observe.js";
import { assertNoLoudGap, settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

describe("Alliance and Piercing attack duration", () => {
  for (const accept of [true, false]) {
    it(`${accept ? "retains paid Alliance through" : "declines Alliance before"} ordinary battle and Piercing checks`, async () => {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "AD1-009", as: "attacker" },
            { card: "BT10-064", as: "ally" },
          ],
          deck: ["BT1-009", "BT1-013"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT12-112", as: "defender", suspended: true }],
          deck: ["BT1-009", "BT1-013"],
          security: [
            { card: "BT12-112", as: "firstSecurity" },
            { card: "BT12-112", as: "secondSecurity" },
          ],
        },
      });
      s.state.memory = 10;
      await s.ready();
      const attacker = s.perm("attacker");
      const ally = s.perm("ally");
      expect(attacker.currentDP).toBe(12000);
      expect(ally.currentDP).toBe(8000);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
      const prompt = s.events.find((event) => event.kind === "alliancePrompt");
      expect(prompt).toMatchObject({ eligibleAllyIds: [ally.permanentId] });
      expect(
        s.engine.applyIntent(0, {
          type: "respondAlliance",
          ...(accept ? { allyPermanentId: ally.permanentId } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.pendingDecision).toBeUndefined();
      expect(ally.isSuspended).toBe(accept);
      expect(s.state.memory).toBe(10);
      const checked = s.events.filter((event) => event.kind === "securityChecked");
      expect(checked).toHaveLength(accept ? 2 : 0);
      expect(checked.map((event) => event.battle)).toEqual(
        accept
          ? [
              { attackerDeleted: false, securityDigimonDeleted: true },
              { attackerDeleted: false, securityDigimonDeleted: true },
            ]
          : [],
      );
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
        accept ? [s.inst("attacker").instanceId, s.inst("ally").instanceId] : [s.inst("ally").instanceId],
      );
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
        accept ? [] : [s.inst("attacker").instanceId],
      );
      expect(attacker.currentDP).toBe(12000);
      expect(attacker.securityAttack).toBe(1);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual(
        accept ? [] : [s.inst("defender").instanceId],
      );
      expect(s.state.players[1]!.security).toHaveLength(accept ? 0 : 2);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
        accept
          ? [
              s.inst("defender").instanceId,
              s.inst("firstSecurity").instanceId,
              s.inst("secondSecurity").instanceId,
            ].sort()
          : [],
      );
      assertNoLoudGap(s);
    });
  }
});

describe("Security battle duration boundaries", () => {
  const cases = [
    {
      label: "expires battle DP before the second Digimon check",
      duration: EffectDuration.UntilEndBattle,
      firstCard: "BT1-084",
      survives: false,
    },
    {
      label: "preserves attack DP across both Digimon checks",
      duration: EffectDuration.UntilEndAttack,
      firstCard: "BT1-084",
      survives: true,
    },
    {
      label: "does not end a battle when checking a Tamer",
      duration: EffectDuration.UntilEndBattle,
      firstCard: "BT1-085",
      survives: true,
    },
  ];
  for (const { label, duration, firstCard, survives } of cases) {
    it(`${label}`, async () => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT23-047", as: "attacker" }], deck: ["BT1-009", "BT1-013"], security: ["BT1-009"] },
        1: {
          deck: ["BT1-009", "BT1-013"],
          security: [
            { card: firstCard, as: "firstSecurity" },
            { card: "BT1-084", as: "secondSecurity" },
          ],
        },
      });
      s.state.memory = 10;
      await s.ready();
      const attacker = s.perm("attacker");
      // No public card currently produces this pre-security battle-scoped DP grant.
      // Arm the production ledger through the named seam; drive every check by public attack.
      advance(s.engine).ledgers.modifiers.addDpModifier(s.state, attacker.permanentId, 1000, duration);
      expect(attacker.currentDP).toBe(16000);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      const checked = s.events.filter((event) => event.kind === "securityChecked");
      expect(checked).toHaveLength(2);
      expect(checked.map((event) => event.battle)).toEqual([
        firstCard === "BT1-084" ? { attackerDeleted: false, securityDigimonDeleted: true } : undefined,
        { attackerDeleted: !survives, securityDigimonDeleted: true },
      ]);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        survives ? [s.inst("attacker").instanceId] : [],
      );
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
        survives ? [] : [s.inst("attacker").instanceId],
      );
      expect(s.state.players[1]!.security).toHaveLength(0);
      expect(s.state.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(
        firstCard === "BT1-085" ? [s.inst("firstSecurity").instanceId] : [],
      );
      expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
        (firstCard === "BT1-085"
          ? [s.inst("secondSecurity").instanceId]
          : [s.inst("firstSecurity").instanceId, s.inst("secondSecurity").instanceId]
        ).sort(),
      );
      expect(attacker.currentDP).toBe(15000);
      expect(s.state.memory).toBe(10);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    });
  }
});
