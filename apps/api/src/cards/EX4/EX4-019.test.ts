import { describe, expect, it } from "vitest";
import { EffectTiming, Zone } from "@aegis/shared";
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

  it("returns level 4 or lower but leaves a level 5 Digimon in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-019", as: "mach" }] },
        1: {
          battleArea: [
            { card: "BT4-010", as: "level4" },
            { card: "BT10-024", as: "level5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("mach"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT4-010")).toBe(true);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT10-024");
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

  it("does not unsuspend with seven cards and does not fire twice at eight cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-009", as: "host", suspended: true, under: ["EX4-019"] }] },
      1: { hand: Array(7).fill("BT1-001") },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").isSuspended).toBe(true);

    s.give(1, Zone.Hand, "BT1-001");
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("digivolves from a blue level 4 and preserves that source in its stack", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-010"],
        battleArea: [{ card: "BT1-032", as: "base" }],
        hand: [{ card: "EX4-019", as: "mach" }],
      },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mach").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX4-019");

    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT1-032");
  });
});
