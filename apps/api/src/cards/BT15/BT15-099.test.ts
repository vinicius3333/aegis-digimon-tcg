import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-099.js";

describe("BT15-099", () => {
  it("stores the trashed Digimon level for the deletion cap and draws for Myotismon text", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "trash", storeAs: "trashedDigimonLevel" },
          actions: [
            { kind: "Delete", target: { filter: { levelLte: "trashedDigimonLevel" } } },
            { kind: "Draw", amount: 2, condition: { kind: "lastTrashedMatchesFilter" } },
          ],
        },
      ],
    });
  });
  it("runs the same body from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true }));

  it("naturally uses the trashed Myotismon level as the deletion cap and draws two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-068", as: "source" }],
          hand: [
            { card: "BT15-099", as: "option" },
            { card: "BT15-076", as: "cost" },
          ],
          deck: ["BT15-007", "BT15-008"],
        },
        1: {
          battleArea: [
            { card: "BT15-072", as: "eligible" },
            { card: "BT15-079", as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const eligibleId = s.perm("eligible").permanentId;
    const tooHighId = s.perm("tooHigh").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === tooHighId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT15-007", "BT15-008"]);
  });
});

async function castVenomInfusionTrashing(costCardId: string) {
  const preferredTargets: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT15-068", as: "source" }],
        hand: [
          { card: "BT15-099", as: "option" },
          { card: costCardId, as: "cost" },
        ],
        deck: ["BT15-007", "BT15-008"],
      },
      1: {
        battleArea: [
          { card: "BT22-079", as: "levelless" },
          { card: "BT15-070", as: "rookie" },
        ],
      },
    },
    { autoSelectCards: true, preferInstanceIds: preferredTargets },
  );
  preferredTargets.push(s.perm("levelless").topCard!.instanceId);
  s.state.memory = 10;
  await s.ready();
  const optionId = s.inst("option").instanceId;
  const costId = s.inst("cost").instanceId;
  const levellessId = s.perm("levelless").permanentId;
  const rookieId = s.perm("rookie").permanentId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.pendingDecision === undefined && s.state.players[0]!.trash.some((card) => card.instanceId === optionId),
  );
  expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(true);
  const remaining = s.state.players[1]!.battleArea.map((p) => p.permanentId);
  return { levellessDeleted: !remaining.includes(levellessId), rookieDeleted: !remaining.includes(rookieId) };
}

describe("BT15-099 Venom Infusion — KB Q&A rulings", () => {
  it("cannot delete a Lv.- Digimon, even after trashing a Lv.- Digimon card for the level cap (Q2596)", async () => {
    expect(await castVenomInfusionTrashing("BT22-079")).toEqual({ levellessDeleted: false, rookieDeleted: false });
    expect(await castVenomInfusionTrashing("BT15-076")).toEqual({ levellessDeleted: false, rookieDeleted: true });
  });
});
