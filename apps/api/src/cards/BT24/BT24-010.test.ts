import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-010.js";
import "../index.js";

describe("BT24-010 Greymon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-010")).toMatchObject({
      cardId: "BT24-010",
      nameEn: "Greymon",
      colors: ["Red", "Black"],
      kinds: ["Digimon"],
      level: 4,
      types: ["Dinosaur", "Titan", "TS"],
    });
  });

  it("grants Blocker and De-Digivolves one opponent Digimon on deletion", () => {
    expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Blocker");
    const deletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")?.actions?.[0] as any;
    expect(deletion).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("retains inherited Raid and alternate requirements", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Raid");
    expect(compiled.digivolutionRequirement ?? []).toHaveLength(2);
  });

  it("intercepts an opposing public attack with Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { battleArea: [{ card: "BT24-010", as: "blocker" }], security: ["BT1-013"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.state.players[1]!.battleArea.map((perm) => perm.permanentId)).toContain(blockerId);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("refuses Blocker and lets the public attack continue", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { battleArea: [{ card: "BT24-010", as: "blocker" }], security: ["BT1-013"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const blockerId = s.perm("blocker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("De-Digivolves exactly one opposing stack when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-010", as: "greymon" }] },
        1: {
          battleArea: [
            { card: "BT24-010", as: "target", under: ["BT24-009"] },
            { card: "BT24-010", as: "other", under: ["BT24-009"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const deletedTopId = s.perm("target").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === deletedTopId));

    expect(s.perm("target").topCard.cardId).toBe("BT24-009");
    expect(s.perm("other").topCard.cardId).toBe("BT24-010");
  });

  it("digivolves from a level 3 TS Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "tsBase" }],
        hand: [{ card: "BT24-010", as: "greymon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("greymon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it.each([
    ["Agumon", "BT1-010"],
    ["non-red TS", "BT24-019"],
  ])("accepts the public %s level-3 alternate route", async (_label, source) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: source, as: "base" }],
        hand: [{ card: "BT24-010", as: "greymon" }],
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("greymon").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("greymon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("rejects a non-Agumon, non-TS level-3 source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-029", as: "base" }], hand: [{ card: "BT24-010", as: "greymon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
  });

  it("deletes itself from a public opponent effect and de-digivolves one opposing stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-010", as: "victim" }] },
        1: {
          hand: [
            { card: "BT24-013", as: "fugamon" },
            { card: "BT1-009", as: "cost" },
          ],
          battleArea: [
            { card: "BT24-010", as: "stack", under: ["BT24-009"] },
            { card: "BT24-010", as: "other", under: ["BT24-009"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("fugamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("victim").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("victim").instanceId);
    expect(s.perm("stack").topCard.cardId).toBe("BT24-009");
    expect(s.perm("other").topCard.cardId).toBe("BT24-010");
  });

  it("publicly evolves from Greymon into Aegiochusmon with exact cost and stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-010", as: "greymon" }],
        hand: [{ card: "BT24-014", as: "aegiochusmon" }],
        deck: [{ card: "BT1-012", as: "bonusDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("aegiochusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greymon").topCard.instanceId === s.inst("aegiochusmon").instanceId);
    expect(s.perm("greymon").stack.map((card) => card.instanceId)).toEqual([s.inst("greymon").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("uses inherited Raid on a public attack against the opponent's highest DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-014", as: "attacker", under: ["BT24-010"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "high", dp: 7000 },
            { card: "BT1-009", as: "low", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const highId = s.perm("high").permanentId;
    const lowId = s.perm("low").permanentId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId));
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).not.toContain(highId);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toContain(lowId);
  });
});
