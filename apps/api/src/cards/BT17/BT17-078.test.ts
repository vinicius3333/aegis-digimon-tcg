import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-078.js";
import "./index.js";

describe("BT17-078 Omnimon", () => {
  it("keeps Blast DNA Digivolve, Raid, and Blocker as separate keyword clauses", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
  });

  it("during DNA Digivolve returns the chosen opponent Digimon and every same-level Digimon", () => {
    for (const effect of [compiled.effects?.[3], compiled.effects?.[4]]) {
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "SelectBind",
            condition: { kind: "isDnaDigivolving" },
            target: { bindAs: "dnaReturnLevel", upTo: true },
          },
          {
            kind: "Return",
            to: "deckBottom",
            condition: { kind: "isDnaDigivolving" },
            target: {
              count: "all",
              filter: { relativeTo: { attr: "level", op: "eq", selectionRef: "dnaReturnLevel" } },
            },
          },
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        ],
      });
    }
  });

  it("keeps the post-return deletion independent of the DNA condition", () => {
    expect(compiled.effects?.[3]?.actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(compiled.effects?.[4]?.actions?.[2]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("deletes one opposing Digimon after a natural non-DNA play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT17-078", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "BT17-063", as: "firstTarget" },
            { card: "BT17-063", as: "survivor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 9;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstTarget").instanceId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstTarget").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("survivor").instanceId)).toBe(true);
  });

  it("returns the chosen DNA level and same-level Digimon, then deletes a remaining target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-025", as: "warGreymon" },
            { card: "BT1-044", as: "metalGarurumon" },
          ],
          hand: [{ card: "BT17-078", as: "omnimon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-043", as: "chosenLevel6" },
            { card: "BT1-043", as: "sameLevel6" },
            { card: "BT17-063", as: "remainingTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("warGreymon").permanentId, s.perm("metalGarurumon").permanentId],
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("chosenLevel6").instanceId) &&
        s.state.players[1]!.deck.some((card) => card.instanceId === s.inst("sameLevel6").instanceId),
    );

    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("chosenLevel6").instanceId, s.inst("sameLevel6").instanceId]),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("remainingTarget").instanceId)).toBe(true);
  });
});
