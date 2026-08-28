import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_048 } from "./BT24-048.js";
import "../index.js";

describe("BT24-048 Deramon", () => {
  it("hatches and may free-digivolve a breeding-area Avian/Bird Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_048.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "Hatch", optional: true });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Digivolve",
        payCost: false,
        from: ["hand"],
        optional: true,
        target: { filter: { zone: "breeding" } },
        into: {
          levelComparison: { op: "lte", value: 5 },
          nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "traitContains" }],
        },
      });
    }
  });
  it("has the inherited once-per-turn battle deletion unsuspend", () => {
    expect(BT24_048.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
    });
  });

  it("has Blocker and hatches into an empty breeding area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-048", as: "deramon" }],
          eggDeck: [{ card: "BT24-001", as: "egg" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("deramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard.instanceId === s.inst("egg").instanceId);

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT24-048")!;
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(s.inst("egg").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("free-digivolves a qualifying breeding Digimon while respecting requirements", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-048", as: "deramon" }],
          breeding: { card: "BT16-008", as: "avian" },
          hand: [{ card: "BT24-048", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("deramon"));
    await settle(() => s.perm("avian").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.perm("avian").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("inherited effect unsuspends its host after that host wins a battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-049", as: "host", under: ["BT24-048"], dp: 9000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }] },
      },
      { autoAcceptOptional: true },
    );
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId));
    await settle(() => !s.perm("host").isSuspended);

    expect(s.perm("host").isSuspended).toBe(false);
  });

  it("inherited effect does not activate for a different battle winner", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-049", as: "host", under: ["BT24-048"], suspended: true },
          { card: "BT1-009", as: "winner" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("winner").permanentId,
    });

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("Q5638: a tied battle removes the host before its inherited effect can activate", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-049", as: "host", under: ["BT24-048"], dp: 9000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 9000 }] },
    });
    const hostId = s.perm("host").permanentId;
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });
});
