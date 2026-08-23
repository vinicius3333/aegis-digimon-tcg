import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-019.js";
import "../index.js";

describe("EX4-019 MachGaogamon", () => {
  it("returns an opposing Digimon of level four or lower", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        count: 1,
      },
    });
  });
  it("unsuspends itself when the opponent has at least eight cards in hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "Unsuspend", condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 } },
      ],
    });
  });

  it("returns an opposing level 4 Digimon on digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX4-019", as: "mach" }] }, 1: { battleArea: [{ card: "BT4-009", as: "target" }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("mach"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT4-009")).toBe(true);
  });

  it("unsuspends itself when the opponent has eight cards in hand", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-009", as: "host", suspended: true, under: ["EX4-019"] }] },
      1: { hand: Array(8).fill("BT1-001") },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.perm("host").isSuspended).toBe(false);
  });
});
