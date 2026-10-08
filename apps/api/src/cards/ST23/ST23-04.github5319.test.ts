import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-02.js";
import "./ST23-03.js";
import "./ST23-04.js";
import "./ST23-13.js";
import "./ST23-15.js";

async function evolveAfterAddingSecurity(costCards: number, faceUp = false) {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "ST23-02", as: "base" },
          {
            card: "ST23-13",
            as: "tamer",
            suspended: true,
            under: Array.from({ length: costCards }, (_, index) => ({ card: "BT1-001", as: `cost${index}`, faceUp })),
          },
        ],
        hand: [
          { card: "ST23-03", as: "cougarmon" },
          { card: "ST23-04", as: "murasamemon" },
        ],
        security: [{ card: "ST23-15", as: "ePulse" }],
        trash: [{ card: "ST23-02", as: "freePlay" }],
        deck: Array(8).fill("BT1-009"),
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
  );
  const optionId = s.inst("ePulse").instanceId;
  const freePlayId = s.inst("freePlay").instanceId;
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("cougarmon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId));
  await drainMicrotasks();
  expect(s.state.players[0]!.security).toHaveLength(1);
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("murasamemon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "ST23-04"));
  await drainMicrotasks();
  return { s, optionId, freePlayId };
}

describe("GitHub #5319 — Murasamemon after Cougarmon adds e-Pulse from security", () => {
  it("uses e-Pulse for 0 and resolves its Main when separate face-down cards pay both printed costs", async () => {
    const { s, optionId, freePlayId } = await evolveAfterAddingSecurity(2);
    expect(s.perm("base").topCard.cardId).toBe("ST23-04");
    expect(s.perm("opponent").currentDP).toBe(5000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === freePlayId)).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-001")).toHaveLength(2);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps e-Pulse in hand when Cougarmon's evolution reduction consumes the only face-down cost card", async () => {
    const { s, optionId, freePlayId } = await evolveAfterAddingSecurity(1);
    expect(s.perm("opponent").currentDP).toBe(5000);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === freePlayId)).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.memory).toBe(8);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not pay either printed face-down cost with a face-up card under the Tamer", async () => {
    const { s, optionId } = await evolveAfterAddingSecurity(2, true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("tamer").stack).toHaveLength(2);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
