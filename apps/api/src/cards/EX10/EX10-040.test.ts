import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-040.js";
import "../index.js";

const CARD_ID = "EX10-040";

describe("EX10-040 DemiDevimon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Evil"],
    });
  });
  it("proves conditional mill-then-memory sequencing and inherited once-per-turn mill", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 2,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "lte", value: 10 },
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "zoneCount", seat: "opponent", zone: "trash", op: "gte", value: 10 },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "TrashTopDeck", controller: "both", amount: 1 }],
    });
  });

  it("Q5120 mills from 8 to 10 opposing trash cards, then gains 1 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "demi" }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-009", "BT1-010"], trash: Array.from({ length: 8 }, () => "BT1-009") },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("demi"));
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(10);
    expect(s.state.memory).toBe(1);
  });

  it("Q5121 skips milling above 10 but still gains 1 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "demi" }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-009", "BT1-010"], trash: Array.from({ length: 11 }, () => "BT1-009") },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("demi"));
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(1);
  });

  it("the realistic inherited stack mills both decks only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-041", as: "host", under: [{ card: CARD_ID, as: "demi" }] }],
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
    expect(s.state.players[1]!.trash).toHaveLength(2); // 1 milled + 1 security battle card
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });
});
