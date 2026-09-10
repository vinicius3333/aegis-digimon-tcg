import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./BT1-064.js";

describe("BT1-064 Goblimon", () => {
  it("matches the vanilla catalog contract and registers residual-free IR", () => {
    expect(getCardDefinition("BT1-064")).toMatchObject({
      cardId: "BT1-064",
      nameEn: "Goblimon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 2,
      dp: 3000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Demon"],
    });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT1-064")?.cardId).toBe("BT1-064");
  });

  it("plays for 2 memory as a 3000 DP Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-064", as: "goblimon" }] } });
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("goblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 3000, currentDP: 3000 });
  });

  it("hatches a legal green Digi-Egg, then digivolves for 0 memory and draws", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-007", as: "egg" }],
        hand: [{ card: "BT1-064", as: "goblimon" }],
        deck: [{ card: "BT1-065", as: "drawn" }, "BT1-050", "BT1-051", "BT1-052", "BT1-053"],
        security: ["BT1-050"],
      },
      1: {
        deck: ["BT1-050", "BT1-051", "BT1-052", "BT1-053", "BT1-054"],
        security: ["BT1-050"],
      },
    });
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("egg").instanceId);
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("goblimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("goblimon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(s.state.players[0]!.breeding).toMatchObject({ baseDP: 3000, currentDP: 3000 });
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects evolution from a red level 3 despite being a Digimon", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT1-064", as: "goblimon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("goblimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
