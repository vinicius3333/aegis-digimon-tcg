import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-06 Sakuyamon: Maid Mode", () => {
  it("moves the opponent's lowest-DP Digimon to security when security is removed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST22-06", as: "maid" },
            { card: "ST22-10", as: "option" },
          ],
          security: [{ card: "BT1-090", as: "security" }],
        },
        1: {
          security: [{ card: "BT1-091", as: "security" }],
          battleArea: [
            { card: "BT1-009", dp: 2000, as: "low" },
            { card: "BT1-010", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST22-06"));
    const maid = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "ST22-06")!;
    expect(advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenOptionUsed", maid.permanentId)).toHaveLength(1);
    expect(
      advance(s.engine).ledgers.subTriggers.subscriptionsFor("whenSecurityRemoved", maid.permanentId),
    ).toHaveLength(1);
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT1-009"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.security.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-091")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010")).toBe(true);
  });

  it("uses the same placement and top-trash behavior when your security is removed", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT1-090", as: "removed" }], battleArea: [{ card: "ST22-06", as: "maid" }] },
        1: {
          security: [
            { card: "BT1-091", as: "top" },
            { card: "BT1-092", as: "bottom" },
          ],
          battleArea: [
            { card: "BT1-009", dp: 2000, as: "low" },
            { card: "BT1-010", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT1-009"));
    expect(s.state.players[1]!.security.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-091")).toBe(true);
  });

  it("does not trash security when the lowest-DP Digimon is prevented from leaving", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT1-090", as: "removed" }],
          battleArea: [{ card: "ST22-06", as: "maid" }],
        },
        1: {
          security: [
            { card: "ST22-10", as: "mandala", faceUp: true },
            { card: "BT1-091", as: "mustRemain" },
          ],
          battleArea: [
            { card: "ST22-03", dp: 2000, as: "protectedLowest" },
            { card: "BT1-010", dp: 6000, as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST22-10"));

    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "ST22-03")).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.cardId === "BT1-091")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-091")).toBe(false);
  });
});
