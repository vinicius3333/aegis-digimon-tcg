import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-052.js";

describe("BT14-052", () => {
  it("is treated as having Leomon in its name by rule", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Leomon"] }],
    }));
  it("on digivolution suspends an opponent and treats itself as Leomon, with Piercing", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      keywords: [{ keyword: "Piercing" }],
      actions: [{ kind: "Suspend" }, { kind: "GrantStatic", grant: "name", tokens: ["Leomon"] }],
    }));
  it("inherits +2000 DP for Leomon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "Aura", effect: { amount: 2000 }, while: { kind: "selfHasNameContaining" } }],
    }));

  it("naturally carries its inherited bonus through a legal Leomon evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-045", as: "base" }],
          hand: [
            { card: "BT14-052", as: "panjyamon" },
            { card: "BT4-061", as: "banchoLeomon" },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target", suspended: false }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("panjyamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("base").topCard?.cardId).toBe("BT14-052");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("banchoLeomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-061");
    expect(s.perm("base").currentDP).toBe(13000);
  });
});

describe("BT14-052 Panjyamon — KB Q&A rulings", () => {
  it("counts as having [Leomon] in its name outside the battle area, so Elecmon can add it from the deck (Q2420)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-044", as: "elecmon" }],
          deck: [
            { card: "BT1-009", as: "nonLeomon" },
            { card: "BT14-052", as: "panjyamon" },
            "BT1-013",
            "BT1-009",
            "BT1-013",
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elecmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT14-052"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("panjyamon").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("nonLeomon").instanceId);
  });

  it("is not a card named exactly [Leomon], so Jeri Kato cannot play it from the hand (Q2421)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX2-058", as: "jeri" },
            { card: "BT14-052", as: "panjyamon" },
            { card: "BT14-048", as: "leomon" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    await s.ready();
    s.state.memory = 10;
    preferInstanceIds.push(s.inst("panjyamon").instanceId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jeri").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-048"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT14-048",
      "EX2-058",
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("panjyamon").instanceId]);
    expect(s.state.memory).toBe(6);
  });
});
