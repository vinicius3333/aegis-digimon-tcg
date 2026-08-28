import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_049 } from "./BT24-049.js";
import "../index.js";

describe("BT24-049 Parrotmon", () => {
  it("gates the lowest-DP bounce on effect entry", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_049.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Return",
        to: "hand",
        condition: { kind: "triggerEnteredByEffect" },
        target: { filter: { controller: "opponent", suspended: true, superlative: "lowestDP" } },
      });
    }
  });
  it("trashes the opponent's top security after a battle deletion once per turn", () => {
    const inherited = BT24_049.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).event).toBe("whenDeletesInBattle");
  });

  it("exposes Fortitude but does not bounce through a normal public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-049", as: "parrotmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("parrotmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT24-049")!;
    expect(observe(s.engine).hasKeyword(played, "Fortitude")).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("replays itself through Fortitude after deletion with a digivolution card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-049", as: "parrotmon", under: ["BT24-047"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const instanceId = s.inst("parrotmon").instanceId;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("parrotmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));

    const replayed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === instanceId);
    expect(replayed).toBeDefined();
    expect(replayed?.stack).toHaveLength(0);
  });

  it.each([
    ["normal green requirement", "BT24-047", false],
    ["alternate TS requirement", "BT24-035", true],
  ])("digivolves for 3 through the %s", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "BT24-049", as: "parrotmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("parrotmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("parrotmon").instanceId);
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.memory).toBe(2);
  });

  it("returns the lowest-DP suspended Digimon when played by an effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-049", as: "parrotmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", suspended: true, dp: 2000 },
            { card: "BT1-010", as: "higher", suspended: true, dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("parrotmon"), { enteredByEffect: 0 });

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("lowest").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("higher").instanceId,
    );
  });

  it("inherited effect trashes security only when its own host wins and survives", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-050", as: "host", under: ["BT24-049"], dp: 9000 }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 3000 }],
        security: [{ card: "BT1-010", as: "security" }],
      },
    });
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
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
  });

  it("Q5639: tied battle deletion does not trash security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-050", as: "host", under: ["BT24-049"], dp: 9000 }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 9000 }],
        security: [{ card: "BT1-010", as: "security" }],
      },
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

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
  });
});
