import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST19/ST19-12.js";
import "./EX11-019.js";

const cardId = "EX11-019";
const tokenId = "TOKEN-Familiar-Token";

describe("EX11-019 Shoemon", () => {
  it("matches the catalog and encodes the optional Familiar Token and inherited Barrier exclusively in IR", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Shoemon",
      colors: ["Yellow"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      types: ["Puppet", "LIBERATOR"],
    });
    expect(getCardDefinition(tokenId)).toMatchObject({
      nameEn: "Familiar Token",
      colors: ["Yellow"],
      level: 3,
      playCost: 0,
      dp: 3000,
      isToken: true,
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "OnDeletion",
        actions: [{ kind: "PlayToken", tokens: ["Familiar"], count: 1, payCost: false, optional: true }],
      },
      {
        trigger: "Static",
        actions: [],
        isInherited: true,
        keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
      },
    ]);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  it.each(["byEffect", "byBattle"] as const)("may play one Familiar Token after %s deletion", async (cause) => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "shoemon" }] } }, { autoAcceptOptional: true });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("shoemon").permanentId], cause)).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === tokenId));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe(tokenId);
    expect(s.state.players[0]!.battleArea[0]!.currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("may decline the On Deletion token play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "shoemon" }] } }, { autoDeclineOptional: true });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("shoemon").permanentId], "byEffect")).toBe(1);
    await settle(() => false, 40);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    assertNoLoudGap(s);
  });

  it("resolves the Familiar Token's printed On Deletion -3000 DP before removing the token (Q860)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: tokenId, as: "familiar" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 7000 }] },
    });
    await s.ready();
    const tokenInstanceId = s.perm("familiar").topCard.instanceId;
    expect(await advance(s.engine).verb.deletePermanent([s.perm("familiar").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("opponent").currentDP === 4000);

    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === tokenInstanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(runtimeCompiledCard(tokenId)!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "ModifyDP",
            amount: -3000,
            duration: "forTheTurn",
            target: expect.objectContaining({ count: 1 }),
          }),
        ],
      }),
    );
    assertNoLoudGap(s);
  });

  it("grants Barrier only while Shoemon is inherited under its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-032", as: "host", under: [cardId] },
          { card: cardId, as: "top" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });

  it("uses inherited Barrier to spend top security and prevent battle deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-032", as: "host", suspended: true, under: [cardId] }],
        security: ["BT1-029"],
      },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("digivolves from a yellow level 2 for zero and rejects an off-color level 2", async () => {
    const valid = setupEngine({
      0: { battleArea: [{ card: "BT1-006", as: "base" }], hand: [{ card: cardId, as: "shoemon" }] },
    });
    valid.state.memory = 1;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("shoemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").topCard.cardId === cardId);
    expect(valid.state.memory).toBe(1);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: cardId, as: "shoemon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("shoemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
