import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-237.js";
import "../EX11/EX11-027.js";

describe("P-237 Unique Emblem: Machina's Ascension", () => {
  it("requires Maquinamon in text and plays Maquinamon or Unchained", () => {
    const effects = runtimeCompiledCard("P-237")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        actions: [
          expect.objectContaining({
            kind: "WaiveColorRequirement",
            condition: expect.objectContaining({ kind: "youHave" }),
          }),
        ],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [
          expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand", "trash"], optional: true }),
          { kind: "PlaceInBattleAreaSelf" },
        ],
      }),
    );
  });

  it("grants Delay when an Unchained is played and digivolves from hand", () => {
    const effects = runtimeCompiledCard("P-237")!.effects;
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenPlayed" })],
      }),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [expect.objectContaining({ kind: "Digivolve", from: ["hand"], payCost: false, optional: true })],
      }),
    );
  });

  it("activates its Main effects from Security", () => {
    expect(runtimeCompiledCard("P-237")!.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }),
    );
  });
});
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-237 engine behavior", () => {
  it("plays a Maquinamon from hand without cost and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-237", as: "emblem" },
            { card: "EX11-027", as: "maquinamon" },
          ],
          battleArea: ["BT1-009", "BT1-037", "BT1-063", "BT1-088", "P-016", "ST6-03", "BT1-084"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    const maquinamonId = s.inst("maquinamon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const playDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const linkDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: linkDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === maquinamonId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "P-237")).toBe(true);
  });
});
