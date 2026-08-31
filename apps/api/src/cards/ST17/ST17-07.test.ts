import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-07 Rapidmon", () => {
  it("de-digivolves one opposing Digimon and protects itself from opponent deletion and return effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-10", as: "henry" }],
          hand: [{ card: "ST17-07", as: "rapidCard" }],
        },
        1: { battleArea: [{ card: "AD1-004", as: "opponent", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const stackBefore = s.perm("opponent").stack.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapidCard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST17-07"));
    const rapidmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "ST17-07")!;
    expect(s.perm("opponent").stack.length).toBe(stackBefore - 1);

    s.state.turnSeat = 1;
    const rapidmonCard = rapidmon.topCard!.instanceId;
    await advance(s.engine).verb.returnToHand([rapidmonCard]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST17-07")).toBe(true);
  });

  it("applies the same effect when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-05", as: "host" },
            { card: "ST17-10", as: "henry" },
          ],
          hand: [{ card: "ST17-07", as: "rapidCard" }],
        },
        1: { battleArea: [{ card: "AD1-004", as: "opponent", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const stackBefore = s.perm("opponent").stack.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("rapidCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "ST17-07");
    expect(s.perm("opponent").stack.length).toBe(stackBefore - 1);
  });

  it("trashes the opponent's top security card once per turn when its host wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-08", as: "host", under: ["ST17-07"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true }], security: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
