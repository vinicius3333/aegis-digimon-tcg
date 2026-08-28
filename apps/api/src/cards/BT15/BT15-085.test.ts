import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-085.js";
import "../index.js";

describe("BT15-085", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-085")).toMatchObject({
      nameEn: "Izzy Izumi",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of the turn when memory is 2 or less", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    }));
  it("may redirect an opponent attack to a suspended Insectoid by suspending this Tamer", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "RedirectAttack", cost: { kind: "suspend" }, optional: true }],
        },
      ],
    }));
  it("plays itself from security", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    }));

  it("naturally redirects an opponent's attack to a suspended Insectoid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-085", as: "izzy" },
            { card: "BT15-053", as: "insect", suspended: true },
          ],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("izzy").isSuspended);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("insect").permanentId)).toBe(
      true,
    );
  });
});
