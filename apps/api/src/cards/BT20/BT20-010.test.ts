import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-010.js";

describe("BT20-010 Ryudamon", () => {
  it("reduces qualifying digivolutions only from the battle area and grants inherited DP", () => {
    const main = compiled.effects.find((entry) => !entry.isInherited);
    expect(main).toMatchObject({ trigger: "YourTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: {
        nameOrTrait: [
          { tokens: ["Ginryumon"], match: "nameExact" },
          { tokens: ["Chronicle"], match: "trait" },
        ],
      },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, colors: ["Black"], traits: ["X Antibody"], cost: 0, isAlternate: true },
    ]);
  });

  it("reduces a qualifying battle-area evolution by 1 but not the same breeding evolution", async () => {
    const battle = setupEngine({
      0: {
        battleArea: [{ card: "BT20-010", as: "ryudamon" }],
        hand: [{ card: "BT20-012", as: "ginryumon" }],
      },
    });
    battle.state.memory = 5;
    await battle.ready();
    expect(
      battle.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: battle.perm("ryudamon").permanentId,
        instanceId: battle.inst("ginryumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => battle.perm("ryudamon").topCard.cardId === "BT20-012");
    expect(battle.state.memory).toBe(3);

    const breeding = setupEngine({
      0: {
        breeding: { card: "BT20-010", as: "ryudamon" },
        hand: [{ card: "BT20-012", as: "ginryumon" }],
      },
    });
    breeding.state.memory = 5;
    await breeding.ready();
    expect(
      breeding.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breeding.perm("ryudamon").permanentId,
        instanceId: breeding.inst("ginryumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => breeding.perm("ryudamon").topCard.cardId === "BT20-012");
    expect(breeding.state.memory).toBe(2);
  });

  it("matches the bracketed Ginryumon destination as an exact name, not a substring", () => {
    const reference = { tokens: ["Ginryumon"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Ginryumon" }, reference)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Ginryumon X" }, reference)).toBe(false);
  });

  it("observably grants its inherited host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-012", dp: 4000, as: "host", under: ["BT20-010"] }], deck: ["BT1-009"] },
      1: { deck: ["BT1-009"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(6000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reduces a legal Chronicle-only non-Ginryumon evolution and keeps the inherited source through the transition", async () => {
    const chronicle = getCardDefinition("BT20-051")!;
    expect(chronicle.nameEn).not.toBe("Ginryumon");
    expect(chronicle.types).toContain("Chronicle");
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-010", as: "ryudamon" }],
        hand: [{ card: "BT20-051", as: "raptordramon" }],
        deck: ["BT1-009"],
      },
      1: { deck: ["BT1-009"] },
    });
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ryudamon").permanentId,
        instanceId: s.inst("raptordramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryudamon").topCard.cardId === "BT20-051");
    expect(s.perm("ryudamon").stack.map((card) => card.cardId)).toEqual(["BT20-010"]);
    expect(s.state.memory).toBe(3); // printed cost 3, reduced by 1 from the battle-area Ryudamon
    expect(s.perm("ryudamon").currentDP).toBe(chronicle.dp + 2000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("ryudamon").currentDP).toBe(chronicle.dp);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("uses the public black X Antibody alternate route and does not reduce a non-Chronicle normal route", async () => {
    const alternate = setupEngine({
      0: { breeding: { card: "BT13-005", as: "egg" }, hand: [{ card: "BT20-010", as: "ryudamon" }] },
    });
    alternate.state.memory = 4;
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("egg").permanentId,
        instanceId: alternate.inst("ryudamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("egg").topCard.cardId === "BT20-010");
    expect(alternate.perm("egg").topCard.cardId).toBe("BT20-010");
    expect(alternate.state.memory).toBe(4);

    const excluded = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "ryudamon" }], hand: [{ card: "BT20-031", as: "nonChronicle" }] },
    });
    excluded.state.memory = 5;
    await excluded.ready();
    expect(
      excluded.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: excluded.perm("ryudamon").permanentId,
        instanceId: excluded.inst("nonChronicle").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => excluded.perm("ryudamon").topCard.cardId === "BT20-031");
    expect(excluded.perm("ryudamon").stack.map((card) => card.cardId)).toEqual(["BT20-010"]);
    expect(excluded.state.memory).toBe(2); // normal Black Lv.3 cost 3; no Chronicle reduction applied
    expect(
      excluded.state.players[0]!.hand.some((card) => card.instanceId === excluded.inst("nonChronicle").instanceId),
    ).toBe(false);
  });
});
