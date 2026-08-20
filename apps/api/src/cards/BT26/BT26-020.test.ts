import {
  CardKind,
  EffectDuration,
  EffectTiming,
  getCardDefinition,
  type CardDefinition,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-020.js";
import "../index.js";

const CARD_ID = "BT26-020";

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT26-020 ShellNumemon", () => {
  it("carries the corrected Lv.3 DS cost-2 text and evolves from an off-color DS Digimon", async () => {
    expect(getCardDefinition(CARD_ID)?.effectText).toContain("[Digivolve] Lv.3 w/[DS] trait: Cost 2");
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX8-056", as: "purpleDs" }],
        hand: [{ card: CARD_ID, as: "shell" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleDs").permanentId,
        instanceId: s.inst("shell").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleDs").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("purpleDs").stack.at(-1)?.cardId).toBe("EX8-056");
  });

  it("rejects the alternate evolution from a non-DS off-color Lv.3", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "plain" }],
        hand: [{ card: CARD_ID, as: "shell" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("plain").permanentId,
        instanceId: s.inst("shell").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("plays for 4, draws first, then locks exactly one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "shell" }], deck: [{ card: "BT1-009", as: "drawn" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "AD1-019", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shell").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("first"), "attack") ||
        observe(s.engine).isRestricted(s.perm("second"), "attack"),
    );

    expect(s.state.memory).toBe(0);
    const locked = [s.perm("first"), s.perm("second")].filter((permanent) =>
      observe(s.engine).isRestricted(permanent, "attack"),
    );
    expect(locked).toHaveLength(1);
    expect(observe(s.engine).isRestricted(locked[0]!, "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "attack")).toBe(false);
  });

  it("draws even when no opposing Digimon exists and opens no target decision", async () => {
    const source = {
      ownerSeat: 0 as Seat,
      isOnBattleArea: () => true,
      permanent: () => ({ permanentId: "shell" }),
    } as unknown as CardSource;
    const draw = vi.fn();
    const chooseTargets = vi.fn();
    const ctx = {
      source,
      game: {
        opponentOf: () => 1 as Seat,
        player: () => ({ battleArea: [] }),
        definitionOf: () => ({ kinds: [CardKind.Digimon] }) as CardDefinition,
      },
      ask: { chooseTargets },
      fx: { draw },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnPlay, source)[0]!.resolve(ctx);

    expect(draw).toHaveBeenCalledWith(0, 1);
    expect(chooseTargets).not.toHaveBeenCalled();
  });

  it("grants inherited Evade and prevents effect deletion by successfully suspending the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST8-07", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Evade")).toBe(true);
    const hostId = s.perm("host").permanentId;
    const deletion = primitives(s).deletePermanent([hostId], "byEffect");
    await settle(() => s.events.some((event) => event.kind === "evadePrompt" && event.permanentId === hostId));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: hostId, accept: true })).toEqual({ ok: true });
    expect(await deletion).toBe(0);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not grant inherited Evade while ShellNumemon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "shell" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("shell"), "Evade")).toBe(false);
  });
});
