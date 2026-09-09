import { getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-051.js";
import "./index.js";

describe("BT17-051 Argomon", () => {
  it("deletes any number of opposing Digimon by level budget, scaling from Argomon sources", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[1]).toMatchObject({
        kind: "DeleteLevelBudget",
        filter: { controller: "opponent", kind: ["Digimon"], hasLevel: true },
        baseBudget: 4,
        upTo: true,
        scaling: { per: 2, budgetAdd: 1, unit: "digivolutionCards" },
      });
    }
  });

  it("prevents opposing Tamers from unsuspending during the opponent's turn", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" },
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
      whileMatchesTargetFilter: true,
    });
  });

  it("matches the catalog printed text, evolution cost and exact-name route", () => {
    const definition = getCardDefinition("BT17-051")!;
    expect(definition).toMatchObject({
      cardId: "BT17-051",
      nameEn: "Argomon",
      colors: ["Green", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      dp: 13000,
      types: ["Mutant"],
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 5 },
        { color: "Purple", level: 5, memoryCost: 5 },
      ],
    });
    expect(definition.effectText).toContain("[Digivolve]Lv.5 [Argomon]: Cost 4");
    expect(definition.effectText).toContain("[Opponent's Turn] None of your opponent's Tamers can unsuspend.");
    // The printed route is "[Digivolve]Lv.5 [Argomon]: Cost 4" (bracketed name, no "in name"),
    // so the requirement is exact-name (namesExact), not the substring `names`. IR change.
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, namesExact: ["Argomon"], cost: 4, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("naturally places Argomon sources before applying the scaled level budget on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-051", as: "argomon" }],
          trash: [
            { card: "BT17-048", as: "sourceOne" },
            { card: "BT17-048", as: "sourceTwo" },
            { card: "BT17-048", as: "sourceThree" },
            { card: "BT17-048", as: "sourceFour" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "levelThreeOne" },
            { card: "BT17-053", as: "levelThreeTwo" },
            { card: "BT17-054", as: "levelFour" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 15;
    const argomonId = s.inst("argomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: argomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-051"));

    const argomon = s.perm("argomon");
    expect(argomon.stack).toHaveLength(4);
    expect(argomon.currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT17-054"]);
  });

  it("digivolves through the printed exact-name [Argomon] route for 4, drawing and firing [When Digivolving]", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-051", as: "argomon6" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [{ card: "BT17-048", as: "base" }],
          trash: [
            { card: "BT17-042", as: "sourceOne" },
            { card: "BT17-042", as: "sourceTwo" },
            { card: "BT17-042", as: "sourceThree" },
            { card: "BT17-042", as: "sourceFour" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }, { card: "BT1-009" }],
        },
        1: {
          battleArea: [
            { card: "BT17-052", as: "oppLevelThreeOne" },
            { card: "BT17-053", as: "oppLevelThreeTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;
    const evolvingId = s.inst("argomon6").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: evolvingId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === evolvingId);

    const argomon = s.perm("base");
    // Cost 4 route taken (10 - 4 = 6); the cost-5 catalog fallback would leave 5.
    expect(s.state.memory).toBe(6);
    // Bonus draw from the top of the deck.
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    // Source-stack identity: base BT17-048 plus 4 placed BT17-042 = 5 Argomon digivolution cards.
    expect(argomon.stack.map((card) => card.instanceId)).toContain(baseInstanceId);
    expect(argomon.stack.filter((card) => card.cardId === "BT17-042")).toHaveLength(4);
    expect(argomon.stack).toHaveLength(5);
    // 5 Argomon → +2000 DP (13000 → 15000) and delete budget 4 + 2 = 6.
    expect(argomon.currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("refuses the cost-4 route from a non-Argomon Lv.5 source and falls back to the catalog cost-5 route", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-051", as: "argomon6" },
            { card: "BT1-009", as: "spare" },
          ],
          battleArea: [{ card: "BT1-076", as: "base" }],
          deck: [{ card: "BT1-010", as: "drawn" }, { card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const evolvingId = s.inst("argomon6").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: evolvingId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === evolvingId);

    // Exact-name gate rejects "MegaKabuterimon"; only the cost-5 catalog Lv.5 route remains.
    expect(s.state.memory).toBe(5);
  });

  it("cannot delete a Lv.- opposing Digimon with the level budget (Q2807)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-051", as: "argomon" }] },
        1: {
          battleArea: [
            { card: "BT19-077", as: "levelless" },
            { card: "BT17-052", as: "levelThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 15;
    const argomonId = s.inst("argomon").instanceId;
    const levellessId = s.inst("levelless").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: argomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-051"));

    // No Argomon placed → base budget 4 deletes only the Lv.3; the Lv.- Digimon is never eligible.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([levellessId]);
  });

  it("places up to 4 sources, taking only what the trash holds (Q2806)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT17-051", as: "argomon" }],
          trash: [
            { card: "BT17-042", as: "sourceOne" },
            { card: "BT17-042", as: "sourceTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 15;
    const argomonId = s.inst("argomon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: argomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-051"));

    const argomon = s.perm("argomon");
    // 2 Argomon placed → +1000 DP (13000 → 14000), proving "up to 4" places the available count.
    expect(argomon.stack).toHaveLength(2);
    expect(argomon.currentDP).toBe(14000);
  });

  it("keeps opposing Tamers suspended through the opponent's unsuspend phase, but not their Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-051", as: "argomon" }] },
        1: {
          battleArea: [
            { card: "BT1-087", suspended: true, as: "oppTamer" },
            { card: "BT1-009", suspended: true, as: "oppDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("oppTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(false);

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);

    expect(s.perm("oppTamer").isSuspended).toBe(true);
    expect(unsuspendedIds).not.toContain(s.perm("oppTamer").permanentId);
    // Comparative control: the restriction is Tamer-scoped, so an opposing Digimon still unsuspends.
    expect(s.perm("oppDigimon").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("oppDigimon").permanentId);
  });
});
