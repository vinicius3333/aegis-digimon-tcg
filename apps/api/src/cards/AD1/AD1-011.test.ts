import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/index.js";

describe("AD1-011 Paildramon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-011");
    const compiled = registeredCompiledCards.get("AD1-011") ?? getCompiledCard("AD1-011");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-011");
    expect(definition?.nameEn).toBe("Paildramon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("protects the digivolved Paildramon from battle deletion until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-053", as: "base" }], hand: [{ card: "AD1-011", as: "paildramon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent", dp: 12000, suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "AD1-011");

    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction(id: string, restriction: string): boolean } }
    ).continuous;
    await settle(() => continuous.hasRestriction(s.perm("base").permanentId, "beDeletedInBattle"));
    expect(continuous.hasRestriction(s.perm("base").permanentId, "beDeletedInBattle")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("base").permanentId),
    ).toBe(true);
  });

  it("digivolves into Imperialdramon while attacking with the cost reduced by 2", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "paildramon" }], hand: [{ card: "BT12-030", as: "imperialdramon" }] },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("paildramon").topCard.cardId === "BT12-030");

    expect(s.state.memory).toBe(3);
    expect(s.perm("paildramon").topCard.cardId).toBe("BT12-030");
  });

  it("may decline the optional Imperialdramon digivolution while attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-011", as: "paildramon" }], hand: [{ card: "BT12-030", as: "imperialdramon" }] },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("paildramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("paildramon").topCard.cardId).toBe("AD1-011");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-030")).toBe(true);
  });

  it("applies the attack-target lock only to DNA digivolution while battle protection is unconditional", async () => {
    const dna = setupEngine({ 0: { battleArea: [{ card: "AD1-011", as: "paildramon" }] } });
    await dna.ready();
    await advance(dna.engine).fireForPermanent(EffectTiming.WhenDigivolving, dna.perm("paildramon"), {
      isDnaDigivolve: true,
    });
    expect(observe(dna.engine).isRestricted(dna.perm("paildramon"), "beDeletedInBattle")).toBe(true);
    expect(observe(dna.engine).isRestricted(dna.perm("paildramon"), "attackTargetChange")).toBe(true);

    const normal = setupEngine({ 0: { battleArea: [{ card: "AD1-011", as: "paildramon" }] } });
    await normal.ready();
    await advance(normal.engine).fireForPermanent(EffectTiming.WhenDigivolving, normal.perm("paildramon"), {
      isDnaDigivolve: false,
    });
    expect(observe(normal.engine).isRestricted(normal.perm("paildramon"), "beDeletedInBattle")).toBe(true);
    expect(observe(normal.engine).isRestricted(normal.perm("paildramon"), "attackTargetChange")).toBe(false);
  });

  it("partitions into its specified Blue Lv.4 and Green Lv.4 cards after opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", as: "paildramon", under: ["AD1-010", "BT8-053"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("paildramon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["AD1-010", "BT8-053"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "AD1-011")).toBe(true);
  });

  it("publishes Partition both directly and as an inherited keyword", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "AD1-011", as: "paildramon" },
          { card: "BT12-030", as: "host", under: ["AD1-011"] },
        ],
      },
    });
    await s.ready();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;

    expect(continuous.hasKeyword(s.perm("paildramon").permanentId, "Partition")).toBe(true);
    expect(continuous.hasKeyword(s.perm("host").permanentId, "Partition")).toBe(true);
  });
});
