import { expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

const exactGammamonCards = ["BT9-023", "BT10-050", "BT10-078", "BT22-020", "BT22-045", "EX10-042", "EX12-013"];

it.each(exactGammamonCards)(
  "#5259 %s accepts Gammamon but rejects BetelGammamon as its named evolution base",
  async (cardId) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-019", as: "betel", under: ["RB1-001", "BT21-010"] },
            { card: "LM-016", as: "gammamon" },
          ],
          hand: [{ card: cardId, as: "destination" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: 5,
        },
        1: { security: 5 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const card = s.inst("destination");
    expect(card.digivolveTargetPermanentIds).not.toContain(s.perm("betel").permanentId);
    expect(card.digivolveTargetPermanentIds).toContain(s.perm("gammamon").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("betel").permanentId,
        instanceId: card.instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gammamon").permanentId,
        instanceId: card.instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gammamon").topCard.cardId === cardId && !s.state.pendingDecision);
    expect(s.state.memory).toBe(8);
  },
);

it("#5259 Strongest of Brothers offers Canoweissmon and excludes GulusGammamon for BetelGammamon", async () => {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT21-019", as: "betel", under: ["RB1-001", "BT21-010"] },
          { card: "BT21-090", as: "brothers" },
        ],
        hand: [
          { card: "BT21-022", as: "trigger" },
          { card: "BT21-010", as: "placed" },
          { card: "BT21-022", as: "canoweiss" },
          { card: "RB1-009", as: "anotherLegal" },
          { card: "EX10-042", as: "gulus" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
        security: 5,
      },
      1: { security: 5, battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  s.state.memory = 20;
  await s.ready();
  preferred.push(s.inst("placed").instanceId, s.perm("betel").permanentId, s.inst("canoweiss").instanceId);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("betel").topCard.cardId === "BT21-022" && !s.state.pendingDecision);
  const choice = s.decisions.find(({ req }) => req.kind === "selectCards" && req.sourceCardId === "BT21-090");
  expect(choice?.req.options?.candidateInstanceIds).toContain(s.inst("canoweiss").instanceId);
  expect(choice?.req.options?.candidateInstanceIds).not.toContain(s.inst("gulus").instanceId);
  expect(s.state.players[0]!.hand.some((c) => c.cardId === "EX10-042")).toBe(true);
  expect(s.state.memory).toBe(10);
});
