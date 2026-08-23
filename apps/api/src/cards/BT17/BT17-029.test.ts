import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-029.js";
import "./index.js";

describe("BT17-029", () => {
  it("draws by suspending a yellow Tamer while attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Draw", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } }],
    });
  });

  it("reduces all opposing security Digimon by 3000 as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifySecurityDP", controller: "opponent", amount: -3000, duration: "permanent" }],
    });
  });

  it("suspends a yellow Tamer to draw when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-029", as: "agumon" },
            { card: "BT1-087", as: "tamer" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("agumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("applies the inherited security DP reduction in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-025", dp: 5000, under: ["BT17-029"], as: "host" }] },
      1: { security: [{ card: "BT1-020", as: "securityDigimon" }] },
    });
    const hostId = s.perm("host").permanentId;
    const securityId = s.inst("securityDigimon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[1]!.security.some((card) => card.instanceId === securityId)).toBe(false);
  });
});
