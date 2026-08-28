import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-077.js";

describe("BT12-077 Arresterdramon", () => {
  it("publicly digivolves from a Save level 3 and gains Rush at the 2-source threshold", async () => {
    expect(digivolutionRequirementsFor("BT12-077")).toContainEqual({
      level: 3,
      texts: ["Save"],
      cost: 2,
      isAlternate: true,
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-060", as: "base", under: ["BT12-005"] }],
        hand: [{ card: "BT12-077", as: "arrester" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("arrester").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-077");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT12-005", "BT12-060"]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Rush")).toBe(true);
  });

  it("rejects the alternate evolution from a plain level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "plain" }], hand: [{ card: "BT12-077", as: "arrester" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plain").permanentId,
        instanceId: s.inst("arrester").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gains Rush when digivolving with at least 2 digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-077", as: "arrester", under: ["BT1-009", "BT1-010"] }] } });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("arrester"));
    expect(observe(s.engine).hasKeyword(s.perm("arrester"), "Rush")).toBe(true);
  });

  it("does not gain Rush with fewer than 2 digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-077", as: "arrester", under: ["BT1-009"] }] } });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("arrester"));
    expect(observe(s.engine).hasKeyword(s.perm("arrester"), "Rush")).toBe(false);
  });

  it("Saves itself then places a Save peer under the Tamer in exact order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-077", as: "host" },
            { card: "BT12-094", as: "tamer" },
          ],
          trash: [{ card: "BT12-060", as: "peer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.perm("host").topCard.instanceId;
    const peerId = s.inst("peer").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId, peerId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("declining optional Save still performs the mandatory Then placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-077", as: "host" },
            { card: "BT12-094", as: "tamer" },
          ],
          trash: [{ card: "BT12-060", as: "peer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("host").instanceId;
    const peerId = s.inst("peer").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.perm("tamer").stack.length === 1);
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([peerId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
  });

  it("draws from its inherited Save-host attack effect once per turn", async () => {
    const inherited = setupEngine({
      0: {
        battleArea: [{ card: "BT12-077", as: "inheritedHost", under: ["BT12-077"] }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    await inherited.ready();
    await advance(inherited.engine).fire(EffectTiming.OnUseAttack, inherited.perm("inheritedHost"));
    await advance(inherited.engine).fire(EffectTiming.OnUseAttack, inherited.perm("inheritedHost"));
    expect(inherited.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not draw inherited on a non-Save host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-077"] }], deck: ["BT1-010"] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
