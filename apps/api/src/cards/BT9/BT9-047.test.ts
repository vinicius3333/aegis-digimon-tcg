import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-030.js";
import { compiled } from "./BT9-047.js";

describe("BT9-047 Pomumon", () => {
  it("matches catalog and all-turn universal effect-play restriction IR", () => {
    expect(getCardDefinition("BT9-047")).toMatchObject({
      cardId: "BT9-047", nameEn: "Pomumon", colors: ["Green"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 2000, evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }], forms: ["Rookie"],
      attributes: ["Data"], types: ["Vegetation"],
    });
    expect(compiled).toEqual({
      effects: [{ trigger: "AllTurns", actions: [{ kind: "RestrictPlay", seat: "any", filter: { kind: ["Digimon"] }, mode: "play", byEffectOnly: true, duration: "permanent" }] }],
      coverage: "full", residual: [],
    });
  });

  it("prevents Digimon from being played by effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-030", as: "source", under: [{ card: "BT9-026", as: "material" }] }] },
        1: { battleArea: [{ card: "BT9-047", as: "pomumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
