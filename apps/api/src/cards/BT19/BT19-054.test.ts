import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-054 MegaGargomon", () => {
  it("has Security Attack +1 and publicly evolves from green level 5 for 5", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT19-050", as: "base" }], hand: [{ card: "BT19-054", as: "mega" }], deck: ["BT19-030"],
    } }, { autoDeclineOptional: true });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, {
      type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("mega").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-054");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT19-050"]);
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("base"), "SecurityAttack")).toBe(1);
  });

  it.each([EffectTiming.WhenDigivolving, EffectTiming.OnUseAttack])("%s may bottom-deck only a suspended opponent Digimon", async (timing) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-054", as: "mega" }] },
      1: { battleArea: [
        { card: "BT1-009", as: "suspended", suspended: true }, { card: "BT1-015", as: "active" },
      ], deck: ["BT19-030"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(timing, s.perm("mega"));
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT1-015"]);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("may decline without moving the suspended Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-054", as: "mega" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    }, { autoDeclineOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("mega"));
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT1-009"]);
  });
});
