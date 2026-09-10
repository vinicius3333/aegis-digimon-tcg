import { advance } from "../../engine/testkit/advance.js";
import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-047.js";
import "./index.js";

describe("BT20-047 Solarmon", () => {
  it("has Blocker as a main effect and Reboot as an inherited effect", () => {
    expect(getCardDefinition("BT20-047")).toMatchObject({
      cardId: "BT20-047",
      nameEn: "Solarmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Machine"],
    });
    expect(compiled.effects.find((effect) => !effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Reboot" }],
    });
  });

  it("evolves for 0 and may block an opposing attack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT20-005", as: "base" },
        hand: [{ card: "BT20-047", as: "solarmon" }],
        security: ["BT1-011"],
        deck: ["BT1-010", "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "attacker" }],
        hand: ["BT1-010"],
        deck: ["BT1-010", "BT1-010"],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("solarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT20-047");
    expect(s.state.memory).toBe(0);

    const turnLoop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("base").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);

    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("base").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("is publicly playable for its catalog cost and enters with Blocker", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT20-047", as: "solarmon" }], deck: ["BT1-010", "BT1-010"] },
      1: { deck: ["BT1-010", "BT1-010"] },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("solarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-047"));
    expect(s.state.memory).toBe(7);
    expect(observe(s.engine).hasKeyword(s.perm("solarmon"), "Blocker")).toBe(true);
  });

  it("grants Reboot only from its inherited position and unsuspends the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-050", under: ["BT20-047"], as: "host" },
          { card: "BT20-047", as: "standalone" },
        ],
        security: ["BT1-011"],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: { security: ["BT1-011", "BT1-011", "BT1-011"], deck: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    const turnLoop = s.engine.startTurnLoop();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Reboot")).toBe(false);

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("standalone").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("unsuspends only an inherited Reboot host through the real opponent Active phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-050", under: ["BT20-047"], as: "host" },
          { card: "BT20-047", as: "standalone" },
        ],
        security: ["BT1-011"],
        deck: ["BT1-010", "BT1-010", "BT1-010"],
      },
      1: { security: ["BT1-011", "BT1-011", "BT1-011"], deck: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("standalone").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("standalone").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.perm("standalone").isSuspended).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
