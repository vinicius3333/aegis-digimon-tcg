import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-019.js";
import "./BT6-030.js";
import "./BT6-088.js";

describe("BT6 Gabumon Bond of Friendship historical deck", () => {
  it("moves Gabumon from breeding, evolves through Matt, attacks twice, and deletes Bond at end of turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT6-019", as: "gabumon" },
          battleArea: [{ card: "BT6-088", as: "matt" }],
          hand: [{ card: "BT6-030", as: "bond" }],
          deck: [
            { card: "BT1-001", as: "mattDraw" },
            { card: "BT1-002", as: "digivolveDraw" },
          ],
          security: ["BT1-003", "BT1-004", "BT1-005"],
        },
        1: {
          battleArea: [
            { card: "BT3-015", as: "firstBounce", under: [{ card: "BT1-006", as: "firstSource" }] },
            { card: "BT5-040", as: "secondBounce", under: [{ card: "BT1-007", as: "secondSource" }] },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: ["BT1-004"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const firstBounceInstanceId = s.perm("firstBounce").topCard.instanceId;
    const secondBounceInstanceId = s.perm("secondBounce").topCard.instanceId;
    s.state.phase = Phase.Breeding;
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, {
      type: "moveFromBreeding",
      permanentId: s.perm("gabumon").permanentId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.memory === 1 &&
      s.state.players[0]!.hand.some((card) =>
        card.instanceId === s.inst("mattDraw").instanceId
      )
    );

    preferred.push(s.perm("gabumon").topCard.instanceId);
    s.state.phase = Phase.Main;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("matt").topCard.instanceId,
      effectKey: "BT6-088/main-digivolve-bond-of-friendship",
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("gabumon").topCard.instanceId === s.inst("bond").instanceId &&
      s.state.players[0]!.security.length === 1
    );

    preferred.splice(0, preferred.length, s.perm("firstBounce").permanentId);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gabumon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.deck.at(-1)?.instanceId === firstBounceInstanceId &&
      !s.perm("gabumon").isSuspended
    );
    await settle();

    preferred.splice(0, preferred.length, s.perm("secondBounce").permanentId);
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gabumon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.deck.at(-1)?.instanceId === secondBounceInstanceId &&
      !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking
    );

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("gabumon").isSuspended).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("firstSource").instanceId,
        s.inst("secondSource").instanceId,
      ]),
    );

    const bondId = s.inst("bond").instanceId;
    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === bondId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === bondId)).toBe(true);
    assertNoLoudGap(s);
  });
});
