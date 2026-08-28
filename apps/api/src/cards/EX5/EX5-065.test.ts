import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-065.js";
import "./EX5-065.js";

describe("EX5-065 Sayo & Koh", () => {
  it("registers the your-turn add-digivolution memory effect and opponent-turn start effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-065",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-065")!;
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(watcher?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      requirePlacedOwnTopAtStackBottom: true,
    });
    expect(module.effectsForTiming(EffectTiming.OnStartTurn, source)[0]?.description).toContain("DNA digivolve");
  });
  it("registers the mandatory security play effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-065",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-065")!;
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)[0]?.optional).toBe(false);
  });
  it("documents the end-of-turn return for the Digimon played from digivolution cards", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-065",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-065")!;
    expect(module.effectsForTiming(EffectTiming.OnStartTurn, source)[0]?.description).toContain(
      "return the Digimon played",
    );
  });

  it("suspends Sayo & Koh and gains memory when an effect adds one of your Digimon's sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-065", as: "sayo" },
            { card: "BT1-080", as: "host", under: ["BT1-010"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const memoryBefore = s.state.memory;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardsPosition: "bottom",
      placedOwnTopAtStackBottom: true,
      byEffectSeat: 0,
    });
    await settle(() => s.perm("sayo").isSuspended && s.state.memory === memoryBefore + 1, 2000);

    expect(s.perm("sayo").isSuspended).toBe(true);
    expect(s.state.memory).toBe(memoryBefore + 1);
  });

  it("does not trigger for ordinary digivolution-card addition, per Q3669", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-065", as: "sayo" },
            { card: "BT1-076", as: "host" },
          ],
          hand: [{ card: "BT1-080", as: "evolver" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-080", 2000);

    expect(s.perm("host").topCard?.cardId).toBe("BT1-080");
    expect(s.perm("sayo").isSuspended).toBe(false);
  });
});
