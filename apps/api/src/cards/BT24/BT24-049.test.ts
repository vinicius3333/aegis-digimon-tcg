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

  it("exposes Fortitude but does not bounce after a normal play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-049", as: "parrotmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("parrotmon"), "Fortitude")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("parrotmon"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(0);
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
