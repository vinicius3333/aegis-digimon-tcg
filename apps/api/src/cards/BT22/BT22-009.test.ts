import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-009.js";
import "../index.js";

describe("BT22-009 Effecmon", () => {
  it("plays from Security only at end of battle and deletes 4000-DP-or-less Digimon on entry", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, timing: "endOfBattle" });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { isSelfRef: true }, isSelf: true },
      payCost: false,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 4000 } }, count: 1 } }],
    });
  });

  it("deletes exactly one 4000-DP opponent while leaving a 5000-DP near-boundary target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-009", as: "effecmon" }] },
        1: {
          battleArea: [
            { card: "BT22-009", dp: 4000, as: "eligible" },
            { card: "BT22-010", dp: 5000, as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("effecmon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooLarge").permanentId,
    ]);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-009")).toBe(true);
  });

  it("plays itself from security without cost at the security timing and then resolves On Play", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT22-009", as: "securityEffecmon" }] }, 1: { battleArea: [{ card: "BT22-009", dp: 4000, as: "target" }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("securityEffecmon"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-009")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-009")).toBe(true);
  });

  it("resolves Security at the end of a real attack against a security Effecmon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", dp: 5000, as: "attacker" }, { card: "BT22-009", dp: 3000, as: "victim" }] },
        1: { security: [{ card: "BT22-009", as: "securityEffecmon" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-009"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-009")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-009")).toBe(true);
  });

  it("digivolves through the legal red level-3 route and resolves When Digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT22-009", as: "effecmon" }] }, 1: { battleArea: [{ card: "BT22-009", dp: 4000, as: "target" }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("effecmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT22-009"));
    expect(s.perm("base").topCard?.cardId).toBe("BT22-009");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-009")).toBe(true);
  });

  it("accepts the alternate non-red Stnd. level-3 route and rejects a non-Stnd. non-red source", async () => {
    const stnd = setupEngine({ 0: { battleArea: [{ card: "BT22-030", as: "stndBase" }], hand: [{ card: "BT22-009", as: "effecmon" }] } });
    await stnd.ready();
    stnd.state.memory = 3;
    expect(stnd.engine.applyIntent(0, { type: "digivolve", permanentId: stnd.perm("stndBase").permanentId, instanceId: stnd.inst("effecmon").instanceId }).ok).toBe(true);
    await settle(() => stnd.perm("stndBase").topCard?.cardId === "BT22-009");
    expect(stnd.perm("stndBase").topCard?.cardId).toBe("BT22-009");
    const invalid = setupEngine({ 0: { battleArea: [{ card: "BT22-019", as: "nonStndBase" }], hand: [{ card: "BT22-009", as: "effecmon" }] } });
    await invalid.ready();
    invalid.state.memory = 3;
    expect(invalid.engine.applyIntent(0, { type: "digivolve", permanentId: invalid.perm("nonStndBase").permanentId, instanceId: invalid.inst("effecmon").instanceId }).ok).toBe(false);
  });

  it("adds the printed 3000 link DP when a real linked state is established", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-035", linked: [{ card: "BT22-009", as: "linkedEffecmon" }], as: "host" }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(8000);
    expect(s.perm("host").linked.some((card) => card.instanceId === s.inst("linkedEffecmon").instanceId)).toBe(true);
  });

  it("links from hand for 2 memory, adds 3000 DP, and resolves the 4000-DP boundary", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-035", as: "host" }], hand: [{ card: "BT22-009", as: "link" }] }, 1: { battleArea: [{ card: "BT22-009", dp: 4000, as: "eligible" }, { card: "BT22-010", dp: 5000, as: "tooLarge" }] } });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "linkCard", instanceId: s.inst("link").instanceId, targetPermanentId: s.perm("host").permanentId })).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    expect(s.state.memory).toBe(8);
    expect(s.perm("host").currentDP).toBe(11000);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId)).toBe(true);
  });

  it("links Effecmon through BT22-039's effect-driven play on attack to a legal Appmon recipient", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-039", under: [{ card: "BT22-009", as: "effecmon" }], as: "ouranosmon" }],
          hand: [{ card: "BT21-009", as: "played" }],
        },
        1: { battleArea: [{ card: "BT22-009", dp: 4000, as: "eligible" }, { card: "BT22-010", dp: 5000, as: "tooLarge" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("played").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.linked.some((card) => card.instanceId === s.inst("effecmon").instanceId))).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId)).toBe(true);
  });

});
