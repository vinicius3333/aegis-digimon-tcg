import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-055.js";

describe("EX6-055 DanDevimon", () => {
  it("deletes an opposing level 5 or lower Digimon, or trashes one of their hand cards if no deletion occurs", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", target: { filter: { levelComparison: { op: "lte", value: 5 } } } },
      { kind: "Trash", condition: { kind: "ifThisEffectDidNotAct" } },
    ]));
  it("grants Rush and Security Attack +1 while the opponent has five or fewer hand cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "Aura",
        effect: { kind: "keyword", keyword: { keyword: "Rush" } },
        while: { kind: "zoneCount", op: "lte", value: 5 },
      },
      {
        kind: "Aura",
        effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        while: { kind: "zoneCount", op: "lte", value: 5 },
      },
    ]));
  it("publicly deletes an opposing level 5 Digimon on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-055", as: "dan" }] }, 1: { battleArea: [{ card: "BT1-024", as: "victim" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dan"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("publicly trashes one opponent hand card when no qualifying Digimon can be deleted", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-055", as: "host" }] },
        1: { hand: [{ card: "BT1-010", as: "opponentCard" }], battleArea: [{ card: "EX6-043", as: "ineligible" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("host").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host") !== undefined && s.state.players[1]!.hand.length === 0);
    await settle(() => s.state.players[1]!.hand.length === 0);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("publicly plays from hand, pays 11 memory, and deletes an opposing level-5 Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-055", as: "dan" }] },
        1: { battleArea: [{ card: "BT1-024", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 11;
    await s.ready();
    const victimPermanentId = s.perm("victim").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dan").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("dan") !== undefined &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimPermanentId),
    );

    expect(s.perm("dan").topCard.cardId).toBe("EX6-055");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("dan").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("victim").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly grants Rush and Security Attack +1 only at the five-card hand boundary", async () => {
    const active = setupEngine({
      0: { battleArea: [{ card: "EX6-055", as: "host" }] },
      1: { hand: Array.from({ length: 5 }, () => "BT1-010") },
    });
    active.state.turnSeat = 0;
    await active.ready();
    expect(observe(active.engine).hasKeyword(active.perm("host"), "Rush")).toBe(true);
    expect(observe(active.engine).keywordAmount(active.perm("host"), "SecurityAttack")).toBe(1);
    const inactive = setupEngine({
      0: { battleArea: [{ card: "EX6-055", as: "host" }] },
      1: { hand: Array.from({ length: 6 }, () => "BT1-010") },
    });
    inactive.state.turnSeat = 0;
    await inactive.ready();
    expect(observe(inactive.engine).hasKeyword(inactive.perm("host"), "Rush")).toBe(false);
    expect(observe(inactive.engine).keywordAmount(inactive.perm("host"), "SecurityAttack")).toBe(0);
  });

  it("legally evolves from a purple level 5, pays 3 memory, and deletes through When Digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-051", as: "base" }], hand: [{ card: "EX6-055", as: "dan" }] },
        1: { battleArea: [{ card: "BT1-024", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dan").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard.cardId).toBe("EX6-055");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX6-051"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("rejects a red level 5 as an illegal evolution source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-024", as: "base" }], hand: [{ card: "EX6-055", as: "dan" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dan").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
