import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-086.js";
describe("BT10-086 Omnimon (X Antibody)", () => {
  it("bottom-decks all opposing Digimon tied for the highest level", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-025", as: "base", under: ["BT6-111"] }], hand: [{ card: "BT10-086", as: "evolving" }] }, 1: { battleArea: ["BT6-111", "AD1-014", { card: "BT2-047", as: "lower" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true }); s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("lower").permanentId);
  });

  it("reduces its alternate Omnimon digivolution cost by 2 when X Antibody is in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-025", as: "base", under: ["BT9-109"] }],
        hand: [{ card: "BT10-086", as: "evolving" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("BT9-109");

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-086");

    expect(s.state.memory).toBe(2);
  });

  it("does not reduce its cost for an X Antibody-trait Digimon instead of the exact Option", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-025", as: "base", under: ["BT9-064"] }],
        hand: [{ card: "BT10-086", as: "evolving" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-086");

    expect(s.state.memory).toBe(0);
  });

  it("does not use an X Antibody-trait level 5 as the exact X Antibody cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-086", as: "omnimon", under: [{ card: "BT9-064", as: "traitOnly" }] }] },
        1: { security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("omnimon"));

    expect(s.perm("omnimon").stack.some(({ instanceId }) => instanceId === s.inst("traitOnly").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("reveals all opposing security, lets its controller trash the chosen card, then shuffles the rest face-down", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-086", as: "omnimon", under: [{ card: "BT9-109", as: "cost" }] }],
      },
      1: {
        battleArea: [{ card: "BT1-028", as: "target", suspended: true }],
        security: [
          { card: "BT1-001", as: "first" },
          { card: "BT1-002", as: "chosen" },
          { card: "BT1-003", as: "last" },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.inst("cost").instanceId, s.inst("chosen").instanceId);
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("omnimon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("chosen").instanceId));

    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("chosen").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("cost").instanceId);
  });
});
