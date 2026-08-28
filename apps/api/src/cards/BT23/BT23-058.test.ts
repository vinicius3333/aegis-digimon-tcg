import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-058.js";

describe("BT23-058 Craniamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-058")).toMatchObject({
      cardId: "BT23-058",
      nameEn: "Craniamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("deletes all tied lowest-play-cost opponents when Craniamon suspends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-058", as: "craniamon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low1" },
          { card: "BT1-009", as: "low2" },
          { card: "BT23-068", as: "high" },
        ],
      },
    });
    const highId = s.perm("high").permanentId;
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("craniamon").permanentId,
    });
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(highId);
  });

  it("exposes Reboot and Blocker through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-058", as: "craniamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("craniamon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("craniamon"), "Blocker")).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Reboot", "Blocker"]);
  });

  it("protects one of your Digimon or Tamers from an opponent effect by suspending this Digimon", () => {
    const replacement = (
      compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.actions[0]?.kind === "Replacement") as any
    ).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      leaveCause: "byOpponentEffect",
      sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"] },
      target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: 1 },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
    });
  });

  it("suspends to protect an ally from an opposing effect and triggers the lowest-cost deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-058", as: "craniamon" },
            { card: "BT23-049", as: "ally" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT23-068", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const allyId = s.perm("ally").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === allyId)).toBe(true);
    expect(s.perm("craniamon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT23-068"]);
  });

  it("once per turn deletes all opposing lowest-play-cost Digimon when this Digimon suspends", () => {
    const effect = compiled.effects.find(
      (entry) => entry.trigger === "AllTurns" && entry.actions[0]?.kind === "SubTrigger",
    ) as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestPlayCost" }, count: "all" } },
      ],
    });
  });

  it("digivolves for 3 from an off-color level-5 CS card and rejects a non-CS peer", () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "BT23-044", as: "base" }], hand: [{ card: "BT23-058", as: "craniamon" }] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("craniamon").instanceId,
      }),
    ).toEqual({ ok: true });
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-039", as: "base" }], hand: [{ card: "BT23-058", as: "craniamon" }] },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("craniamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
