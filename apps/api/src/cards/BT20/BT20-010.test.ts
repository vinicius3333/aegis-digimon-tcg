import { describe, expect, it } from "vitest";
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
          { tokens: ["Ginryumon"], match: "name" },
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

  it("observably grants its inherited host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-012", dp: 4000, as: "host", under: ["BT20-010"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("uses the public black X Antibody alternate route and excludes non-Chronicle destinations", async () => {
    const alternate = setupEngine({
      0: { breeding: { card: "BT13-005", as: "egg" }, hand: [{ card: "BT20-010", as: "ryudamon" }] },
    });
    await alternate.ready();
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: alternate.perm("egg").permanentId,
        instanceId: alternate.inst("ryudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.perm("egg").topCard.cardId === "BT20-010");
    expect(alternate.perm("egg").topCard.cardId).toBe("BT20-010");

    const excluded = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "ryudamon" }], hand: [{ card: "BT20-011", as: "nonChronicle" }] },
    });
    excluded.state.memory = 5;
    await excluded.ready();
    expect(
      excluded.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: excluded.perm("ryudamon").permanentId,
        instanceId: excluded.inst("nonChronicle").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => excluded.perm("ryudamon").topCard.cardId === "BT20-011");
    expect(excluded.perm("ryudamon").topCard.cardId).toBe("BT20-011");
    expect(excluded.state.memory).toBe(3);
  });
});
