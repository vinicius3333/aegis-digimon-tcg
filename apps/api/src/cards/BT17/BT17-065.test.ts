import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-065.js";
import "./index.js";

describe("BT17-065 DexDorugamon", () => {
  it("matches the catalog printed text, requirement and coverage", () => {
    expect(getCardDefinition("BT17-065")).toMatchObject({
      cardId: "BT17-065",
      nameEn: "DexDorugamon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      inheritedEffectText: "＜Reboot＞.",
    });
    const printed = getCardDefinition("BT17-065")!.effectText!;
    expect(printed).toContain("[Digivolve][Dorugamon]: Cost 0");
    expect(printed).toContain(
      "[Trash] [All Turns] When one of your [Dorugamon] would be deleted, by digivolving it into this card without paying the cost, prevent that deletion.",
    );
    expect(printed).toContain(
      "[When Digivolving] Trash 1 card in your hand. Then, ＜Draw 1＞. If [Dorugamon] is in this Digimon's digivolution cards or this digivolved from the trash, delete 1 of your opponent's Digimon with a play cost of 4 or less instead.",
    );
    // Printed "[Digivolve][Dorugamon]: Cost 0" carries no "in name", so the route name is exact.
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Dorugamon"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("shapes the [Trash] replacement to digivolve from trash before preventing deletion", () => {
    const replacement = compiled.effects.find((entry) => entry.isFromTrash)?.actions[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBeDeleted",
      target: {
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Dorugamon"], match: "name" }] },
      },
      sourceFilter: { zone: "trash", controller: "mine" },
      leaveCause: "any",
      digivolveFromTrash: true,
      abortOnDecline: true,
    });
  });

  it("shapes [When Digivolving] as mandatory hand trash, then draw-or-delete on the same condition (Q2820)", () => {
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "Draw",
      amount: 1,
      condition: { kind: "not", condition: { kind: "anyOf" } },
    });
    expect(actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", playCostLte: 4 }, count: 1 },
      condition: { kind: "anyOf" },
    });
  });

  it("digivolves Dorugamon through the [Dorugamon] cost-0 route, then deletes a play-cost-4-or-less Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-062", as: "dorugamon" }],
          hand: [
            { card: "BT17-065", as: "dexDorugamon" },
            { card: "BT1-011", as: "toTrash" },
          ],
          deck: [{ card: "BT1-012", as: "bonusDraw" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowCost" },
            { card: "BT17-025", as: "highCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const dorugamonId = s.perm("dorugamon").permanentId;
    const dexId = s.inst("dexDorugamon").instanceId;
    const lowCostId = s.perm("lowCost").permanentId;
    const highCostId = s.perm("highCost").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: dorugamonId,
        instanceId: dexId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowCostId));

    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === dorugamonId);
    expect(evolved?.topCard.cardId).toBe("BT17-065");
    expect(evolved?.stack.some((card) => card.cardId === "BT7-062")).toBe(true);
    expect(s.state.memory).toBe(0);
    // Delete branch fired (Dorugamon in stack): the play-cost-2 Digimon is gone, the cost-7 one stays.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highCostId)).toBe(true);
    // The mandatory hand trash still happened; the effect did not draw instead.
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-011")).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-012")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a non-Dorugamon Lv3 through the normal route, so it draws instead of deleting", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-063", as: "dorumon" }],
          hand: [
            { card: "BT17-065", as: "dexDorugamon" },
            { card: "BT1-011", as: "toTrash" },
          ],
          deck: [
            { card: "BT1-012", as: "bonusDraw" },
            { card: "BT1-013", as: "effectDraw" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "safe" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const dorumonId = s.perm("dorumon").permanentId;
    const dexId = s.inst("dexDorugamon").instanceId;
    const safeId = s.perm("safe").permanentId;
    const trashBefore = s.state.players[0]!.trash.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: dorumonId,
        instanceId: dexId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);

    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === dorumonId);
    expect(evolved?.topCard.cardId).toBe("BT17-065");
    expect(s.state.memory).toBe(0);
    // Bonus draw plus the effect Draw 1 empties the two-card deck; the mandatory hand trash adds one card.
    expect(s.state.players[0]!.trash.length).toBe(trashBefore + 1);
    // Draw branch: the opponent's Digimon is untouched.
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === safeId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the exact [Dorugamon] route for a near-name source (DexDorugamon), proving namesExact", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT9-075", as: "nearName" }],
        hand: [{ card: "BT17-065", as: "dexDorugamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const nearNameId = s.perm("nearName").permanentId;
    const dexId = s.inst("dexDorugamon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nearNameId,
        instanceId: dexId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: nearNameId,
        instanceId: dexId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("nearName").topCard.cardId).toBe("BT9-075");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === dexId)).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("digivolves from trash to prevent Dorugamon's deletion, then trashes and deletes instead of drawing (Q2817, Q2820)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-062", as: "dorugamon" }],
          trash: [{ card: "BT17-065", as: "dexDorugamon" }],
          hand: [{ card: "BT1-001", as: "discarded" }],
          deck: [{ card: "BT1-011", as: "bonusDraw" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const dorugamonId = s.perm("dorugamon").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([dorugamonId], "byEffect")).toBe(0);
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    const protectedDigimon = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === dorugamonId);
    expect(protectedDigimon?.topCard.cardId).toBe("BT17-065");
    expect(protectedDigimon?.stack.some((card) => card.cardId === "BT7-062")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("allows Dorugamon's deletion when DexDorugamon is unavailable in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-062", as: "dorugamon" }] },
      1: { battleArea: [{ card: "BT17-025", as: "target" }] },
    });
    const dorugamonId = s.perm("dorugamon").permanentId;
    const targetId = s.perm("target").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([dorugamonId], "byEffect")).toBe(1);
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === dorugamonId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("grants inherited Reboot to a legal level-5 host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-078", under: ["BT17-065"], as: "host" }] } });
    await s.ready();

    expect(s.perm("host").topCard.cardId).toBe("BT14-078");
    expect(s.perm("host").stack.some((card) => card.cardId === "BT17-065")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
