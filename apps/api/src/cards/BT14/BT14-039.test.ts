import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-039.js";

describe("BT14-039", () => {
  it("preserves Monzaemon's catalog, alternate route, and exact IR", () => {
    expect(getCardDefinition("BT14-039")).toMatchObject({
      nameEn: "Monzaemon", colors: ["Yellow"], level: 5, playCost: 7, dp: 7000,
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 4 }],
      forms: ["Ultimate"], attributes: ["Vaccine"], types: ["Puppet"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [],
      digivolutionRequirement: [{ level: 4, names: ["Numemon"], cost: 3, isAlternate: true }],
    });
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 2, optional: true, abortOnDecline: true, cost: {
        kind: "place", destination: "digivolutionStack", position: "bottom", host: "self",
        target: { filter: { zone: "trash", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Numemon"], match: "name" }] } },
      } }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn", actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, while: { kind: "selfHasNameContaining", names: ["Monzaemon", "Numemon"] } }],
    });
  });

  it("places the exact trash Numemon at stack bottom and gains 2 memory on play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT14-039", as: "monzaemon" }], trash: [{ card: "BT14-058", as: "numemon" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monzaemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.instanceId === s.inst("numemon").instanceId)));
    const host = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT14-039")!;
    expect(host.stack.map((card) => card.cardId)).toEqual(["BT14-058"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });

  it("uses the Numemon alternate evolution cost and Armor Purges instead of deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-058", as: "base" }], hand: [{ card: "BT14-039", as: "monzaemon" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("monzaemon").instanceId, useAlternateCost: true })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-039");
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Armor Purge")).toBe(true);
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("base").permanentId], "byEffect")).toBe(0);
    await settle(() => s.perm("base").topCard.cardId === "BT14-058");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT14-039");
    assertNoLoudGap(s);
  });

  it("inherited Security Attack +1 applies only to a Monzaemon/Numemon-named host on its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-066", as: "matching", under: ["BT14-039"] }, { card: "BT14-040", as: "control", under: ["BT14-039"] }] },
      1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("matching"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("control"), "SecurityAttack")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("matching").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
