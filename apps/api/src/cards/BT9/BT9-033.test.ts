import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-030.js";
import { compiled } from "./BT9-033.js";

describe("BT9-033 Pillomon", () => {
  it("matches its catalog and all-turn effect-play restriction IR", () => {
    expect(getCardDefinition("BT9-033")).toMatchObject({
      cardId: "BT9-033", nameEn: "Pillomon", colors: ["Yellow"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 2000, evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }], forms: ["Rookie"],
      attributes: ["Vaccine"], types: ["Mammal"],
    });
    expect(compiled).toEqual({
      effects: [{ trigger: "AllTurns", actions: [{ kind: "RestrictPlay", seat: "any", filter: { kind: ["Digimon"] }, mode: "play", byEffectOnly: true, duration: "permanent" }] }],
      coverage: "full", residual: [],
    });
  });

  it("prevents effect plays but permits a normal Digimon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-030", as: "source", under: [{ card: "BT9-026", as: "material" }] }],
          hand: [{ card: "BT10-019", as: "normalPlay" }],
        },
        1: { battleArea: [{ card: "BT9-033", as: "pillomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    expect(s.perm("source").stack).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("normalPlay").instanceId,
      }),
    ).toEqual({ ok: true });
  });
});
