import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-019.js";

describe("BT23-019 Gekomon", () => {
  it("matches the catalog and carries both timings plus inherited Blocker", () => {
    expect(getCardDefinition("BT23-019")).toMatchObject({
      cardId: "BT23-019",
      nameEn: "Gekomon",
      colors: ["Blue"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Amphibian", "CS"],
      inheritedEffectText: "＜Blocker＞",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "TrashDigivolution",
        target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
        scope: "acrossDigimon",
        amount: 2,
      });
    }
    expect(compiled.effects).toContainEqual({
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
  });

  it("on play trashes exactly two sources from one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-019", as: "gekomon" }] },
        1: { battleArea: [{ card: "BT1-041", as: "target", under: ["BT23-018", "BT23-017"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("does not trash own cards, top cards, or hosts without sources", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-019", as: "gekomon" }],
          battleArea: [{ card: "BT23-018", as: "own", under: ["BT23-017"] }],
        },
        1: { battleArea: [{ card: "BT1-041", as: "empty" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-019"));
    expect(s.perm("own").stack.map((card) => card.cardId)).toEqual(["BT23-017"]);
    expect(s.perm("empty").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("mandatory trash clamps to the one available source", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-019", as: "gekomon" }] },
        1: { battleArea: [{ card: "BT23-018", as: "target", under: ["BT23-017"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gekomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("uses the alternate level-3 CS evolution recipe and rejects a non-CS peer", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT23-006", as: "base" }],
        hand: [{ card: "BT23-019", as: "gekomon" }],
        deck: ["BT1-009"],
      },
    });
    const baseId = valid.inst("base").instanceId;
    valid.state.memory = 2;
    await valid.ready();
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("gekomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").topCard.instanceId === valid.inst("gekomon").instanceId);
    expect(valid.perm("base").topCard.instanceId).toBe(valid.inst("gekomon").instanceId);
    expect(valid.perm("base").stack[0]!.instanceId).toBe(baseId);
    expect(valid.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "base" }], hand: [{ card: "BT23-019", as: "gekomon" }] },
    });
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("gekomon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });
  it("publicly triggers the When Digivolving trash across two opposing hosts", async () => {
    const sourceIds: [string, string] = ["BT23-017", "BT23-017"];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "base" }],
          hand: [{ card: "BT23-019", as: "gekomon" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT23-018", as: "targetA", under: [sourceIds[0]] },
            { card: "BT23-018", as: "targetB", under: [sourceIds[1]] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const baseInstanceId = s.perm("base").topCard!.instanceId;
    const sourceInstanceIds = [s.perm("targetA").stack[0]!.instanceId, s.perm("targetB").stack[0]!.instanceId];
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gekomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.instanceId === s.inst("gekomon").instanceId && s.state.players[1]!.trash.length === 2,
    );
    expect(s.perm("base").topCard?.instanceId).toBe(s.inst("gekomon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseInstanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("targetA").stack).toHaveLength(0);
    expect(s.perm("targetB").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(sourceInstanceIds));
    expect(s.state.players[1]!.trash.map((card) => card.cardId).every((cardId) => sourceIds.includes(cardId))).toBe(
      true,
    );
  });

  it("carries Blocker only as an inherited effect, not on Gekomon itself", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: {
        battleArea: [
          { card: "BT23-019", as: "gekomonTop" },
          { card: "BT1-041", as: "inheritedHost", under: ["BT23-019"] },
        ],
        security: ["BT1-009"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gekomonTop"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("inheritedHost").permanentId],
    });
  });

  it("uses the inherited Blocker keyword in a real attack window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-041", under: ["BT23-019"], as: "blocker" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    const attack = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(attack).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened).toMatchObject({ eligibleBlockerIds: [s.perm("blocker").permanentId] });
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publicly exposes exactly three opposing source candidates and accepts two across hosts", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-017", as: "base", under: ["BT23-001"] }],
        hand: [{ card: "BT23-019", as: "gekomon" }],
        deck: ["BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-041", as: "targetA", under: ["BT23-017", "BT23-018"] },
          { card: "BT23-018", as: "targetB", under: ["BT23-017"] },
        ],
        breeding: { card: "BT23-017", as: "opponentBreeding" },
        deck: ["BT1-010"],
      },
    });
    const sourceIds: [string, string, string] = [
      s.perm("targetA").stack[0]!.instanceId,
      s.perm("targetA").stack[1]!.instanceId,
      s.perm("targetB").stack[0]!.instanceId,
    ];
    const ownSourceId = s.perm("base").stack[0]!.instanceId;
    const bonusDrawId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gekomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const request = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(request.options?.candidateInstanceIds).toEqual(expect.arrayContaining(sourceIds));
    expect(request.options?.candidateInstanceIds).toHaveLength(3);
    expect(request.options?.min).toBe(2);
    expect(request.options?.max).toBe(2);
    expect(request.options?.candidateInstanceIds).not.toContain(ownSourceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [sourceIds[0], sourceIds[2]] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length === 2);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([sourceIds[0], sourceIds[2]]),
    );
    expect(s.perm("targetA").stack.map((card) => card.instanceId)).toContain(sourceIds[1]);
    expect(s.perm("targetB").stack).toHaveLength(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(ownSourceId);
    expect(s.state.players[1]!.breeding?.topCard?.cardId).toBe("BT23-017");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(bonusDrawId);
  });
});
