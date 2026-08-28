import { EffectTiming, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-104.js";

describe("BT5-104 Catastrophe Cannon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-104")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("De-Digivolves 2 and may play a Diaboromon Token when you control Diaboromon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-084", "BT5-059"], hand: [{ card: "BT5-104", as: "option" }] },
        1: {
          battleArea: [
            {
              card: "BT5-084",
              as: "target",
              under: [
                { card: "BT5-060", as: "bottom" },
                { card: "BT5-064", as: "middle" },
                { card: "BT5-068", as: "upper" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalTopId = s.perm("target").topCard.instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").stack.length === 1 &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("TOKEN")),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([originalTopId, s.inst("upper").instanceId]),
    );
    expect(s.perm("target").topCard.instanceId).toBe(s.inst("middle").instanceId);
    const token = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon");
    expect(token).toBeDefined();
    expect(requireCardDefinition(token!.topCard.cardId)).toMatchObject({
      nameEn: "Diaboromon",
      level: 6,
      playCost: 14,
      dp: 3000,
      forms: ["Mega"],
      attributes: ["Unknown"],
      types: ["Unidentified"],
      isToken: true,
    });
  });

  it("can create the token even when there is no De-Digivolve target", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT5-084", "BT5-059"], hand: [{ card: "BT5-104", as: "option" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("TOKEN")));
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
  });

  it("stops De-Digivolve at a level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-084", "BT5-059"], hand: [{ card: "BT5-104", as: "option" }] },
        1: {
          battleArea: [
            {
              card: "BT5-084",
              as: "target",
              under: [{ card: "BT5-060", as: "level3" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").topCard.instanceId === s.inst("level3").instanceId &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon"),
    );
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("level3").instanceId);
  });

  it("does not treat Diaboromon (X Antibody) as the named Diaboromon condition", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT24-065"], hand: [{ card: "BT5-104", as: "option" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon"),
    ).toHaveLength(0);
  });

  it("allows declining the optional token play", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT5-084", "BT5-059"], hand: [{ card: "BT5-104", as: "option" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "TOKEN-Diaboromon"),
    ).toHaveLength(0);
  });

  it("activates the full Main effect from security", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT5-084"], security: [{ card: "BT5-104", as: "securityOption", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId.includes("TOKEN"))).toBe(true);
  });
});
