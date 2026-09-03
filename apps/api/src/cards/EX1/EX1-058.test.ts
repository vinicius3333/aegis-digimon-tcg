import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-058.js";

describe("EX1-058 Devimon", () => {
  it("returns the inherited Devimon itself after a real host deletion (Q3243)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-058"], dp: 1000 }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX1-058"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX1-058")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX1-060")).toBe(true);
  });

  it("must return a legal purple level 4-or-lower card and ignores other zones (Q3244)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-058"], dp: 1000 }],
          trash: ["BT1-009", "EX1-061"],
          hand: ["EX1-056"],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX1-058"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX1-056")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX1-061")).toBe(true);
  });

  it("mandatorily returns an eligible candidate from trash after host deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-058"], dp: 1000 }],
          trash: [{ card: "EX1-056", as: "candidate" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target", dp: 5000, suspended: true }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("candidate").instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX1-058")).toBe(true);
  });
});
