import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-046.js";
import "../index.js";

const CARD_ID = "EX10-046";

describe("EX10-046 Devimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Fallen Angel"],
    });
  });

  it("proves thresholded mill-then-return sequencing and inherited once-per-turn mill", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["StartOfYourMainPhase", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "TrashTopDeck",
            controller: "both",
            amount: 2,
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
          },
          {
            kind: "Return",
            to: "hand",
            optional: true,
            condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
            target: { filter: { controller: "mine", zone: "trash" }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "TrashTopDeck", controller: "both", amount: 1 }],
    });
  });

  it("Q5127 mills from 8 to 10 opposing trash cards, then returns an eligible card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "devimon" }],
          deck: ["BT1-009", "BT1-010"],
          trash: [
            { card: CARD_ID, as: "fallen" },
            { card: "BT1-009", as: "near" },
          ],
        },
        1: { deck: ["BT1-009", "BT1-010"], trash: Array.from({ length: 8 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("near").instanceId, s.inst("fallen").instanceId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("devimon"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(10);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("fallen").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("near").instanceId);
  });

  it("Q5128 skips milling above 10 but still returns an eligible card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "devimon" }],
          deck: ["BT1-009", "BT1-010"],
          trash: [{ card: CARD_ID, as: "fallen" }],
        },
        1: { deck: ["BT1-009", "BT1-010"], trash: Array.from({ length: 11 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("devimon"));
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("fallen").instanceId);
  });

  it("the inherited When Attacking effect mills both decks only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-053", as: "host", under: [{ card: CARD_ID, as: "devimon" }] }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { deck: ["BT1-009", "BT1-010"], security: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });
});
