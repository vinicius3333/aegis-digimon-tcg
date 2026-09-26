import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../ST1/ST1-16.js";
import { compiled } from "./EX8-008.js";
import "./index.js";

describe("EX8-008", () => {
  it("matches the catalog identity, effects, and alternate evolution requirement", () => {
    expect(getCardDefinition("EX8-008")).toMatchObject({
      cardId: "EX8-008",
      nameEn: "Candlemon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Flame", "NSo"],
      evoCosts: [{ color: "Red", level: 2, memoryCost: 0 }],
      effectText: "[Digivolve]Lv.2 w/[NSo]\u00a0trait: Cost 0 \n\n[On Deletion] Gain 1 memory.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["NSo"], cost: 0, isAlternate: true }]);
  });

  it("gains 1 memory on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
    }));
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
  it("applies inherited DP on a live host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "host", under: [{ card: "EX8-008", as: "candle" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("gains 1 memory when an opponent publicly deletes it with Gaia Force", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-008", as: "candle" }] },
      1: { battleArea: [{ card: "BT1-009", as: "redSource" }], hand: [{ card: "ST1-16", as: "gaiaForce" }] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    const candleInstanceId = s.inst("candle").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === candleInstanceId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === s.inst("gaiaForce").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(1);
  });

  it("digivolves for 0 from an off-color level-2 NSo card and rejects an off-color non-NSo card", async () => {
    const eligible = setupEngine({
      0: { breeding: { card: "EX8-006", as: "nsoEgg" }, hand: [{ card: "EX8-008", as: "candle" }] },
    });
    eligible.state.memory = 0;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("nsoEgg").permanentId,
        instanceId: eligible.inst("candle").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("nsoEgg").topCard.instanceId === eligible.inst("candle").instanceId);
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { breeding: { card: "BT2-005", as: "blackEgg" }, hand: [{ card: "EX8-008", as: "candle" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("blackEgg").permanentId,
        instanceId: ineligible.inst("candle").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
