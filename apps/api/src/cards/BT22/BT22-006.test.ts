import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
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
          battleArea: [{ card: "BT22-046", as: "host", under: ["BT22-006", "BT22-043"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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
    await settle(() => host.topCard?.cardId === "BT22-043");
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
          { card: "BT22-046", as: "host", under: ["BT22-006"] },
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
});
