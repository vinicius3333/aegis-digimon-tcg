import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-060.js";

describe("EX3-060 ExTyrannomon", () => {
  it("has the official dual-color metadata, Blocker, and source restriction text", () => {
    expect(getCardDefinition("EX3-060")).toMatchObject({
      cardId: "EX3-060",
      nameEn: "ExTyrannomon",
      colors: ["Purple", "Green"],
      level: 5,
      playCost: 7,
      dp: 9000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 3 },
        { color: "Green", level: 4, memoryCost: 3 },
      ],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Puppet"],
      rarity: "C",
    });
    expect(getCardDefinition("EX3-060")!.effectText).toContain("＜Blocker＞");
    expect(getCardDefinition("EX3-060")!.effectText).toContain(
      "While this Digimon has no digivolution cards, it can't attack or block.",
    );
  });

  it("keeps Blocker visible but prevents a directly played copy from attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-060", as: "exTyrannomon" }] },
      1: { security: ["BT1-009"] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("exTyrannomon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("exTyrannomon"), "attack")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("exTyrannomon"), "block")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("exTyrannomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("excludes a source-less copy from the block window and rejects its block intent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      1: {
        battleArea: [{ card: "EX3-060", as: "exTyrannomon" }],
        security: ["BT1-010"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.events.some(({ kind }) => kind === "blockWindowOpened")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("exTyrannomon").permanentId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.perm("exTyrannomon").isSuspended).toBe(false);
  });

  it("digivolves from a green level 4 for 3 and can then attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-059", as: "base" }],
        hand: [{ card: "EX3-060", as: "exTyrannomon" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("exTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-060");
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasRestriction(s.perm("base"), "attack")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("base").isSuspended).toBe(true);
  });

  it("digivolves from a purple level 4 for 3 and gains both attack and block permissions", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-074", as: "purpleBase" }],
        hand: [{ card: "EX3-060", as: "exTyrannomon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleBase").permanentId,
        instanceId: s.inst("exTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleBase").topCard.cardId === "EX3-060");

    expect(s.state.memory).toBe(0);
    expect(s.perm("purpleBase").stack).toHaveLength(1);
    expect(observe(s.engine).hasRestriction(s.perm("purpleBase"), "attack")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("purpleBase"), "block")).toBe(false);
  });

  it("blocks with a source, survives, and remains visibly suspended after redirecting combat", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      1: {
        battleArea: [{ card: "EX3-060", under: ["EX3-059"], as: "exTyrannomon" }],
        security: ["BT1-010"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("exTyrannomon").permanentId],
    });
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("exTyrannomon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-009"));

    expect(s.perm("exTyrannomon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("official Q&A: an attack continues when its last source is removed after declaration", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-060", under: [{ card: "BT2-055", as: "puppetSource" }], as: "attacker" }] },
      1: {
        battleArea: [{ card: "ST18-07", as: "possibleBlocker" }],
        security: ["BT1-009"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("attacker").permanentId,
      [s.inst("puppetSource").instanceId],
      1,
    );
    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(observe(s.engine).hasRestriction(s.perm("attacker"), "attack")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT2-055")).toBe(true);
  });

  it("Puppet family: gaining a ToyAgumon source immediately restores attack and block permissions", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX3-060", as: "exTyrannomon" }],
        hand: [{ card: "BT2-055", as: "toyAgumon" }],
      },
      1: { security: ["BT1-009"] },
    });
    await s.ready();
    expect(observe(s.engine).hasRestriction(s.perm("exTyrannomon"), "attack")).toBe(true);

    await advance(s.engine).verb.placeUnder(s.perm("exTyrannomon").permanentId, [s.inst("toyAgumon").instanceId]);
    expect(s.perm("exTyrannomon").stack.map(({ cardId }) => cardId)).toEqual(["BT2-055"]);
    expect(observe(s.engine).hasRestriction(s.perm("exTyrannomon"), "attack")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("exTyrannomon"), "block")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("exTyrannomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
