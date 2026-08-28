import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-063.js";

describe("BT9-063 LoaderLeomon", () => {
  it("matches the complete effectless catalog contract", () => {
    expect(getCardDefinition("BT9-063")).toMatchObject({
      cardId: "BT9-063",
      nameEn: "LoaderLeomon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 2 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Machine"],
    });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("digivolves from a black level 4 for exactly 2 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-061", as: "base" }],
        hand: [{ card: "BT9-063", as: "loaderLeomon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("loaderLeomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("loaderLeomon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("loaderLeomon").instanceId);
  });

  it("rejects a level-4 base without the printed black color", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-001", as: "base" }],
        hand: [{ card: "BT9-063", as: "loaderLeomon" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("loaderLeomon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toContainEqual(s.inst("loaderLeomon"));
  });
});
