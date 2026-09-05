import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const playByAssembly = async (s: ReturnType<typeof setupEngine>, target: string, materials: string[]) => {
  const result = s.engine.applyIntent(0, {
    type: "playCard",
    instanceId: s.inst("target").instanceId,
    assembly: { materialInstanceIds: materials.map((as) => s.inst(as).instanceId) },
  });
  expect(result).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === target));
};

describe("EX11 Assembly EX11-036 / EX11-045 / EX11-046", () => {
  it("plays Dalphomon by Assembly -5 from exactly five green Maquinamon-text Digimon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX11-036", as: "target" }],
        trash: [
          { card: "EX11-027", as: "greenMulti" },
          { card: "EX11-027", as: "greenMulti2" },
          { card: "EX11-029", as: "green1" },
          { card: "EX11-033", as: "green2" },
          { card: "EX11-073", as: "greenMulti3" },
        ],
      },
    });
    s.state.memory = 10;
    await playByAssembly(s, "EX11-036", ["greenMulti", "greenMulti2", "green1", "green2", "greenMulti3"]);
    const played = s.state.players[0]!.battleArea[0]!;
    expect(s.state.memory).toBe(3); // play 12 reduced by Assembly -5
    expect(played.stack.map((c) => c.cardId)).toHaveLength(5);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("rejects a black-only Maquinamon-text material for green Dalphomon", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX11-036", as: "target" }],
        trash: [
          { card: "EX11-027", as: "m1" },
          { card: "EX11-029", as: "m2" },
          { card: "EX11-033", as: "m3" },
          { card: "EX11-073", as: "m4" },
          { card: "EX11-040", as: "wrongColor" },
        ],
      },
    });
    s.state.memory = 10;
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("target").instanceId,
      assembly: { materialInstanceIds: ["m1", "m2", "m3", "m4", "wrongColor"].map((as) => s.inst(as).instanceId) },
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid-material" });
  });

  it("plays Metatromon by Assembly -5 from five black Maquinamon-text Digimon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX11-045", as: "target" }],
        trash: [
          { card: "EX11-027", as: "multi" },
          { card: "EX11-040", as: "black1" },
          { card: "EX11-042", as: "black2" },
          { card: "EX11-073", as: "multi2" },
          { card: "EX11-040", as: "black3" },
        ],
      },
    });
    s.state.memory = 10;
    await playByAssembly(s, "EX11-045", ["multi", "black1", "black2", "multi2", "black3"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(5);
  });

  it("rejects a green-only Maquinamon-text material for black Metatromon", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX11-045", as: "target" }],
        trash: [
          { card: "EX11-027", as: "multi" },
          { card: "EX11-040", as: "black1" },
          { card: "EX11-042", as: "black2" },
          { card: "EX11-073", as: "multi2" },
          { card: "EX11-029", as: "wrongColor" },
        ],
      },
    });
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("target").instanceId,
      assembly: {
        materialInstanceIds: ["multi", "black1", "black2", "multi2", "wrongColor"].map((as) => s.inst(as).instanceId),
      },
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid-material" });
  });

  it("plays Galacticmon by Assembly -6 from eight Vemmon-text cards of mixed kinds", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX11-046", as: "target" }],
        trash: [
          { card: "BT11-061", as: "v1" },
          { card: "BT11-065", as: "v2" },
          { card: "BT11-070", as: "v3" },
          { card: "BT11-105", as: "option" },
          { card: "BT18-092", as: "tamer" },
          { card: "BT21-087", as: "tamer2" },
          { card: "EX11-066", as: "tamer3" },
          { card: "P-244", as: "option2" },
        ],
      },
    });
    s.state.memory = 10;
    await playByAssembly(s, "EX11-046", ["v1", "v2", "v3", "option", "tamer", "tamer2", "tamer3", "option2"]);
    expect(s.state.memory).toBe(2); // play 14 reduced by Assembly -6
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(8);
    for (const as of ["v1", "v2", "v3", "option", "tamer", "tamer2", "tamer3", "option2"]) {
      expect(getCardDefinition(s.inst(as).cardId)?.effectText).toContain("Vemmon");
    }
    expect(getCardDefinition("BT11-105")?.kinds).toContain("Option");
    expect(getCardDefinition("BT18-092")?.kinds).toContain("Tamer");
  });

  it("rejects too few, too many, and hand materials for Assembly -5", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "EX11-036", as: "target" },
          { card: "EX11-027", as: "handMaterial" },
        ],
        trash: [
          { card: "EX11-027", as: "m1" },
          { card: "EX11-029", as: "m2" },
          { card: "EX11-033", as: "m3" },
          { card: "EX11-073", as: "m4" },
        ],
      },
    });
    const attempt = (ids: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("target").instanceId,
        assembly: { materialInstanceIds: ids.map((as) => s.inst(as).instanceId) },
      });
    expect(attempt(["m1", "m2", "m3", "m4"])).toMatchObject({ ok: false, reason: "invalid-material" });
    expect(attempt(["m1", "m2", "m3", "m4", "m1"])).toMatchObject({ ok: false, reason: "invalid-material" });
    expect(attempt(["m1", "m2", "m3", "handMaterial", "m4"])).toMatchObject({ ok: false, reason: "invalid-material" });
  });

  it("rejects wrong text and wrong kind for the Maquinamon-text Digimon recipe", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX11-036", as: "target" }],
        trash: [
          { card: "EX11-027", as: "m1" },
          { card: "EX11-029", as: "m2" },
          { card: "EX11-033", as: "m3" },
          { card: "EX11-073", as: "m4" },
          { card: "BT1-009", as: "wrongText" },
        ],
      },
    });
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("target").instanceId,
      assembly: { materialInstanceIds: ["m1", "m2", "m3", "m4", "wrongText"].map((as) => s.inst(as).instanceId) },
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid-material" });
  });
});
