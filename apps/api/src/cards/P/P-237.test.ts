import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-237.js";
import "../EX11/EX11-029.js";
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

  it("resolves its Security Main effect and plays Maquinamon before placing itself", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "P-237", as: "emblem" }], hand: [{ card: "EX11-027", as: "maquinamon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emblem"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("maquinamon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("emblem").instanceId)).toBe(true);
  });

  it("arms Delay from a real Unchained play and digivolves without paying the qualifying card's cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-237", as: "emblem" },
            { card: "BT1-064", as: "host" },
          ],
          hand: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-029", as: "maquinamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.perm("emblem").placedByEffect = true;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unchained").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("emblem"), "Delay"));
    const delay = (
      observe(s.engine).activatableEffects(s.perm("emblem")) as Array<{ effectKey: string; description?: string }>
    ).find((entry) => /delay/i.test(entry.description ?? ""));
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("emblem").instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("maquinamon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("maquinamon").instanceId);
    expect(s.state.memory).toBe(6);
  });
});
