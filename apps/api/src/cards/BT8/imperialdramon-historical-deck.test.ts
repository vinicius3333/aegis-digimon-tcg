import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT3/BT3-111.js";
import "../ST9/ST9-05.js";
import "./BT8-112.js";

describe("BT3/ST9/BT8 Imperialdramon historical deck", () => {
  it("bridges DNA Paildramon through Dragon Mode into Paladin Mode and clears the opposing board", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-05", as: "paildramon" }],
          hand: [
            { card: "BT3-111", as: "dragonMode" },
            { card: "BT8-112", as: "paladinMode" },
          ],
          trash: [{ card: "BT5-112", as: "zwartDefeat" }],
          deck: [
            { card: "BT1-028", as: "dragonModeDraw" },
            { card: "BT1-029", as: "paladinModeDraw" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "battleTarget", dp: 1000, suspended: true },
            { card: "BT1-015", as: "stackedTarget", under: ["BT1-010"] },
            { card: "BT1-009", as: "bareTarget" },
          ],
          security: ["BT1-011"],
          deck: ["BT1-012"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const battleTargetId = s.perm("battleTarget").permanentId;
    preferred.push(
      s.inst("zwartDefeat").instanceId,
      s.perm("paildramon").topCard.instanceId,
      s.perm("stackedTarget").permanentId,
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("paildramon").permanentId,
      instanceId: s.inst("dragonMode").instanceId,
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("paildramon").topCard.cardId === "BT3-111" &&
        s.state.memory === 7 &&
        s.state.players[0]!.hand.some((card) =>
          card.instanceId === s.inst("dragonModeDraw").instanceId,
        ),
      5000,
    );
    expect(observe(s.engine).hasPierce(s.perm("paildramon"))).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("paildramon").permanentId,
      target: { kind: "permanent", permanentId: battleTargetId },
    })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === battleTargetId) &&
        s.state.players[1]!.security.length === 0 &&
        !s.perm("paildramon").isSuspended,
      5000,
    );
    expect(s.state.memory).toBe(7);

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("paildramon").permanentId,
      instanceId: s.inst("paladinMode").instanceId,
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("paildramon").topCard.cardId === "BT8-112" &&
        s.state.players[1]!.battleArea.length === 0,
      5000,
    );

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT5-112")).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "ST9-05")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    assertNoLoudGap(s);
  });

  it("uses different two-color sources to clear stacked targets when digivolving and attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "BT3-111",
            as: "dragonMode",
            under: [
              { card: "ST9-05", as: "paildramonSource" },
              { card: "ST9-11", as: "dinobeemonSource" },
            ],
          }],
          hand: [{ card: "BT8-112", as: "paladinMode" }],
          trash: [{ card: "BT5-112", as: "whiteLevelSeven" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "firstTarget", under: ["BT1-009"] },
            { card: "BT1-016", as: "secondTarget", under: ["BT1-010"] },
          ],
          security: ["BT1-011"],
          deck: ["BT1-012"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    preferred.push(
      s.inst("whiteLevelSeven").instanceId,
      s.inst("paildramonSource").instanceId,
      firstTargetId,
      s.inst("dinobeemonSource").instanceId,
      secondTargetId,
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("dragonMode").permanentId,
      instanceId: s.inst("paladinMode").instanceId,
    })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) =>
          permanent.permanentId === firstTargetId
        ) &&
        s.state.players[1]!.battleArea.some((permanent) =>
          permanent.permanentId === secondTargetId
        ),
      5000,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.some((card) =>
      card.instanceId === s.inst("whiteLevelSeven").instanceId
    )).toBe(true);
    expect(s.state.players[0]!.deck.some((card) =>
      card.instanceId === s.inst("paildramonSource").instanceId
    )).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("dragonMode").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking,
      5000,
    );

    expect(s.state.players[0]!.deck.some((card) =>
      card.instanceId === s.inst("dinobeemonSource").instanceId
    )).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
