import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_053 } from "./BT24-053.js";
import "../index.js";

describe("BT24-053 Protecmon", () => {
  it("matches the catalog identity and printed keyword contract", () => {
    expect(getCardDefinition("BT24-053")).toMatchObject({
      cardId: "BT24-053",
      nameEn: "Protecmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      forms: ["Stnd.", "Appmon"],
      attributes: ["System"],
      types: ["Security"],
      linkDp: 2000,
    });
    expect(getCardDefinition("BT24-053")?.linkRequirement?.replace(/\u00a0/g, " ")).toBe(
      "[Link] [Appmon] trait: Cost 1",
    );
  });

  it("has its printed Blocker keyword and Appmon level-2 evolution", () => {
    expect(BT24_053.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
    expect(BT24_053.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
  });

  it("models its cost-1 Appmon link and linked Blocker", () => {
    expect(BT24_053.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(BT24_053.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
  });

  it("digivolves from a level-2 Appmon for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-003", as: "base" },
        hand: [{ card: "BT24-053", as: "protecmon" }],
        deck: [{ card: "BT1-009", as: "draw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.inst("base").instanceId;
    const drawId = s.inst("draw").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("protecmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("protecmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("protecmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
  });

  it("also uses its normal black level-2 evolution requirement for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT17-005", as: "base" },
        hand: [{ card: "BT24-053", as: "protecmon" }],
        deck: [{ card: "BT1-009", as: "draw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.inst("base").instanceId;
    const drawId = s.inst("draw").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("protecmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("protecmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("protecmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
  });

  it("rejects a legal-level but non-Appmon blue source for both routes", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-003", as: "base" }, hand: [{ card: "BT24-053", as: "protecmon" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("protecmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.cardId).toBe("BT1-003");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("protecmon").instanceId);
  });

  it("links to an Appmon for cost 1, adds 2000 DP, and grants Blocker", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT24-053", as: "protecmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("protecmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("protecmon").instanceId));
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Blocker"));

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("rejects linking to a non-Appmon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host" }],
        hand: [{ card: "BT24-053", as: "protecmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("protecmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("protecmon").instanceId)).toBe(true);
  });

  it("accepts Protecmon's public Blocker window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-053", as: "blocker" }], security: [{ card: "BT1-013", as: "checked" }] },
      1: { battleArea: [{ card: "BT1-020", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const securityId = s.inst("checked").instanceId;
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).not.toContain(blockerId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("blocker").instanceId);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toContain(s.perm("attacker").permanentId);
  });

  it("declines Protecmon's public Blocker window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-053", as: "blocker" }], security: [{ card: "BT1-013", as: "checked" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("checked").instanceId);
    expect(s.perm("blocker").isSuspended).toBe(false);
  });

  it("uses the linked Protecmon Blocker through a public link and battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT24-053", as: "protecmon" }],
        security: [{ card: "BT1-013", as: "checked" }],
      },
      1: { battleArea: [{ card: "BT1-020", as: "attacker" }] },
    });
    s.state.memory = 3;
    await s.ready();
    const linkedId = s.inst("protecmon").instanceId;
    const hostId = s.inst("host").instanceId;
    const securityId = s.inst("checked").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkedId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === linkedId));
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-009")).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([linkedId]));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([linkedId, hostId]),
    );
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("attacker").permanentId,
    );
  });
});
