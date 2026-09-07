import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "./effects/collect.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/BT22/index.js";
import "../cards/EX5/index.js";

function mainEffect(s: ReturnType<typeof setupEngine>, alias: string): string {
  const source = (s.engine as any).cardSourceOf(s.perm(alias).topCard);
  return effectsOf(EffectTiming.OnDeclaration, source).find((entry) => entry.effectKey.startsWith("EX5-064/"))!
    .effectKey;
}

describe("compound rotation digivolve preflight", () => {
  it("allows already-played Koh & Sayo to rotate then evolve the promoted Moonmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-064", as: "koh" },
            { card: "BT22-069", as: "host", under: ["BT22-006"] },
          ],
          hand: [{ card: "BT22-069", as: "evolving" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;
    await s.ready();
    const source = (s.engine as any).cardSourceOf(s.perm("koh").topCard);
    const key = mainEffect(s, "koh");
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey: key }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("evolving").instanceId),
    );
    expect(s.perm("koh").isSuspended).toBe(true);
    const evolved = s.state.players[0]!.battleArea.find(
      (p) => p.topCard?.instanceId === s.inst("evolving").instanceId,
    )!;
    expect(evolved.stack.at(-1)?.cardId).toBe("BT22-006");
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-006")).toBe(false);
  });

  it("allows Koh & Sayo's public On Play path to rotate before evolving", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-069", as: "host", under: ["BT22-006"] }],
          hand: [
            { card: "EX5-064", as: "koh" },
            { card: "BT22-069", as: "evolving" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.inst("evolving").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koh").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("evolving").instanceId),
    );
    expect(s.perm("koh").isSuspended).toBe(true);
    const evolved = s.state.players[0]!.battleArea.find(
      (p) => p.topCard?.instanceId === s.inst("evolving").instanceId,
    )!;
    expect(evolved.stack.at(-1)?.cardId).toBe("BT22-006");
  });

  it("rotates a Light Fang host while evolving a different legal Digimon (Q3668)", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-017", as: "rotationHost", under: ["BT22-006"] },
            { card: "BT22-053", as: "otherBase" },
          ],
          hand: [
            { card: "EX5-064", as: "koh" },
            { card: "BT22-057", as: "otherEvolving" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.inst("otherBase").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koh").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("otherEvolving").instanceId),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX5-017")).toBe(true);
    expect(s.perm("koh").isSuspended).toBe(true);
    expect(s.perm("otherBase").topCard?.instanceId).toBe(s.inst("otherEvolving").instanceId);
    expect(s.perm("otherBase").stack.map((card) => card.cardId)).toEqual(["BT22-053"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("otherEvolving").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("can rotate one eligible stack while evolving another eligible stack without projecting both", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-064", as: "koh" },
            { card: "EX5-017", as: "rotationHost", under: ["BT22-006"] },
            { card: "BT22-069", as: "evolutionHost", under: ["BT22-006"] },
          ],
          hand: [{ card: "BT22-072", as: "evolving" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.perm("rotationHost").permanentId);
    await s.ready();
    const source = (s.engine as any).cardSourceOf(s.perm("koh").topCard);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey: mainEffect(s, "koh"),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionHost").topCard?.instanceId === s.inst("evolving").instanceId);

    expect(s.perm("evolutionHost").topCard?.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.perm("evolutionHost").stack.map((card) => card.cardId)).toEqual(["BT22-006", "BT22-069"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX5-017")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("keeps invalid post-rotation destinations illegal", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-064", as: "koh" },
          { card: "BT22-069", as: "host", under: ["BT22-006"] },
        ],
        hand: [{ card: "BT22-072", as: "invalid" }],
      },
    });
    await s.ready();
    const source = (s.engine as any).cardSourceOf(s.perm("koh").topCard);
    const key = mainEffect(s, "koh");
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey: key }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("koh").isSuspended).toBe(false);
    expect(s.perm("host").topCard?.cardId).toBe("BT22-069");
  });

  it("does not mutate the rotation cost when the player refuses", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-064", as: "koh" },
            { card: "BT22-069", as: "host", under: ["BT22-006"] },
          ],
          hand: [{ card: "BT22-069", as: "evolving" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    const source = (s.engine as any).cardSourceOf(s.perm("koh").topCard);
    const key = mainEffect(s, "koh");
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey: key }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    const decision = s.decisions.find((entry) => entry.req.kind === "optional")!;
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.req.decisionId,
      response: { kind: "optional", accept: false },
    });
    await settle();
    expect(s.perm("koh").isSuspended).toBe(false);
    expect(s.perm("host").topCard?.cardId).toBe("BT22-069");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolving").instanceId)).toBe(true);
  });

  it("does not consume an unavailable rotation cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX5-064", as: "koh" },
          { card: "BT22-069", as: "host" },
        ],
        hand: [{ card: "BT22-069", as: "evolving" }],
      },
    });
    await s.ready();
    const source = (s.engine as any).cardSourceOf(s.perm("koh").topCard);
    const key = mainEffect(s, "koh");
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey: key }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("koh").isSuspended).toBe(false);
    expect(s.perm("host").topCard?.cardId).toBe("BT22-069");
  });
});
