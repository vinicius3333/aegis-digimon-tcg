import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX5-036.js";

describe("EX5-036 Aquilamon", () => {
  it("matches the catalog and encodes Fortitude plus the inherited suspended DP aura", () => {
    expect(getCardDefinition("EX5-036")).toMatchObject({
      cardId: "EX5-036",
      nameEn: "Aquilamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Free"],
      types: ["Giant Bird"],
      effectText: expect.stringContaining("＜Fortitude＞"),
      inheritedEffectText: expect.stringContaining("While this Digimon is suspended"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Fortitude",
      raw: "＜Fortitude＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended" },
        },
      ],
    });
  });

  it("replays publicly for free after battle deletion when it has a legal source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-036", as: "aquilamon", under: ["EX5-035"], suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 8000 }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    const instanceId = s.inst("aquilamon").instanceId;
    expect(observe(s.engine).hasKeyword(s.perm("aquilamon"), "Fortitude")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("aquilamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    const replayed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === instanceId)!;
    expect(replayed.topCard?.cardId).toBe("EX5-036");
    expect(replayed.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX5-035");
    expect(s.state.memory).toBe(0);
  });

  it("does not replay publicly when deletion finds no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-036", as: "aquilamon", suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 8000 }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("aquilamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX5-036");
  });

  it("applies the inherited +1000 DP only after a public attack suspends the host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-036", as: "host", under: ["EX5-035"] }] },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    const baseDP = s.perm("host").baseDP;
    expect(s.perm("host").currentDP).toBe(baseDP);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(baseDP + 1000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("takes the legal green level-3 evolution route and rejects a wrong-color source", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "EX5-035", as: "greenBase" }],
        hand: [{ card: "EX5-036", as: "aquilamon" }],
      },
    });
    await legal.ready();
    legal.state.memory = 10;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("greenBase").permanentId,
        instanceId: legal.inst("aquilamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("greenBase").topCard?.cardId === "EX5-036");
    expect(legal.state.memory).toBe(8);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongColor" }],
        hand: [{ card: "EX5-036", as: "aquilamon" }],
      },
    });
    await illegal.ready();
    illegal.state.memory = 10;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongColor").permanentId,
        instanceId: illegal.inst("aquilamon").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.state.memory).toBe(10);
    expect(illegal.perm("wrongColor").topCard?.cardId).toBe("BT1-009");
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-036"]);
  });
});
