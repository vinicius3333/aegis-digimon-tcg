import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-028.js";
import "../BT14/BT14-098.js";

describe("BT7-028 KingWhamon", () => {
  it("plays a level 3 source when attacking and returns an opposing level 4 after trashing its sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-028", under: [{ card: "BT1-010", as: "rookie" }], as: "kingwhamon" }] },
        1: {
          battleArea: [{ card: "BT6-049", under: [{ card: "BT1-011", as: "targetSource" }], as: "target" }],
          security: ["BT1-101"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard!.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kingwhamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("rookie").instanceId,
        ) && s.state.players[1]!.hand.some((card) => card.instanceId === targetId),
    );

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("targetSource").instanceId)).toBe(true);
  });
});

describe("BT7-028 KingWhamon — KB Q&A rulings", () => {
  it("does not return an opposing Digimon when an opponent's De-Digivolve exposes a digivolution card (Q1548)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT7-028", under: [{ card: "BT1-010", as: "rookie" }], as: "kingwhamon" },
            { card: "BT1-020", under: [{ card: "BT1-027", as: "exposedSource" }], as: "victim" },
          ],
        },
        1: {
          battleArea: [{ card: "BT6-049", as: "target" }],
          security: [{ card: "BT14-098", as: "dcdBomb" }, "BT1-101"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const targetId = s.perm("target").topCard!.instanceId;
    preferred.push(s.perm("victim").topCard!.instanceId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("dcdBomb"));
    await settle(() => s.perm("victim").topCard?.instanceId === s.inst("exposedSource").instanceId);
    await s.ready();

    expect(s.state.turnSeat).toBe(0);
    expect(s.perm("victim").topCard?.instanceId).toBe(s.inst("exposedSource").instanceId);
    expect(s.perm("target").topCard?.instanceId).toBe(targetId);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kingwhamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("rookie").instanceId),
    ).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === targetId)).toBe(true);
  });
});
