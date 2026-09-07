import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import "../EX5/index.js";
import { compiled } from "./BT22-006.js";

describe("BT22-006 Moonmon", () => {
  it("registers only compiled IR for the exact bottom rotation trigger", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { byEffect: true },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardsPosition: "bottom",
          requirePlacedOwnTopAtStackBottom: true,
        },
      ],
    });
  });

  it("draws and trashes only when the host's own top card is rotated to the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009"],
          // Legal green/yellow stack: Moonmon is a source egg under Terriermon,
          // then Gargomon evolves over the Terriermon level 3.
          battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-006", "BT22-043"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const host = s.perm("host");
    const source = (s.engine as any).cardSourceOf(host.stack.find((card) => card.cardId === "BT22-043")!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-043/"),
    )!.effectKey;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.cardId === "BT22-046");
    await settle();

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(host.stack[0]!.cardId).toBe("BT22-046");
  });

  it("does not draw for an ordinary card placement, another stack, or the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-001", "BT1-002"],
        hand: [{ card: "BT1-009", as: "placed" }],
        battleArea: [
          { card: "BT22-046", as: "host", under: ["BT22-006", "BT22-043"] },
          { card: "BT22-046", as: "otherHost" },
        ],
      },
    });
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("placed").instanceId]);
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("otherHost").permanentId,
      addedDigivolutionCardsPosition: "bottom",
      placedOwnTopAtStackBottom: true,
    });
    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardsPosition: "bottom",
      placedOwnTopAtStackBottom: true,
    });

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("confirms the Q5212 after-state is a legal evolution once Moonmon is promoted", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-006", as: "host", under: ["BT22-069"] },
        hand: [{ card: "BT22-069", as: "evolving" }],
      },
    });
    await s.ready();
    const host = s.perm("host");
    expect(host.topCard?.cardId).toBe("BT22-006");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => host.topCard?.instanceId === s.inst("evolving").instanceId);
    expect(host.topCard?.instanceId).toBe(s.inst("evolving").instanceId);
  });

  it("does not activate after Koh & Sayo rotates Moonmon and immediately digivolves the host (Q5212)", async () => {
    const preferredIds: string[] = [];
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
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.inst("evolving").instanceId);
    const originalLunamonId = s.perm("host").topCard!.instanceId;
    const moonmonId = s.perm("host").stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();

    const kohSource = (s.engine as any).cardSourceOf(s.perm("koh").topCard);
    const kohEffects = effectsOf(EffectTiming.OnDeclaration, kohSource);
    const kohEffectKey = kohEffects.find((effect) => effect.effectKey.startsWith("EX5-064/"))!.effectKey;
    expect(kohEffectKey).toContain("EX5-064/");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: kohSource.instanceId,
        effectKey: kohEffectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("evolving").instanceId,
      ),
    );

    const evolved = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("evolving").instanceId,
    )!;
    expect(s.perm("koh").isSuspended).toBe(true);
    expect(evolved.topCard?.instanceId).toBe(s.inst("evolving").instanceId);
    expect(evolved.stack.map((card) => card.instanceId)).toContain(originalLunamonId);
    expect(evolved.stack.map((card) => card.instanceId)).toContain(moonmonId);
    expect(evolved.stack.at(-1)?.instanceId).toBe(moonmonId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolving").instanceId)).toBe(false);
    // The effect-paid evolution performs the ordinary evolution draw. Moonmon's
    // inherited effect must not add a second draw or trash a hand card (Q5212).
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === moonmonId)).toBe(false);
  });
});
