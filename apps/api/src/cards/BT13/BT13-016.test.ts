import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-016.js";

describe("BT13-016 SaviorHuckmon", () => {
  it("after an allied Sistermon play may digivolve into Jesmon while paying 2 less", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-016", as: "savior" }], hand: [{ card: "BT6-082", as: "sistermon" }, { card: "BT13-017", as: "jesmon" }], deck: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sistermon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("savior").topCard.cardId === "BT13-017");
    await settle();
    expect(s.state.memory).toBe(6);
  });

  it("when its Royal Knight host attacks, may play a Sistermon from trash for free only once per turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-017", as: "host", under: ["BT13-016"] }], trash: [{ card: "BT6-082", as: "first" }, { card: "BT6-082", as: "second" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT6-082")).toHaveLength(1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT6-082")).toHaveLength(1);
  });

  it("does not play Sistermon when the inherited host lacks the Royal Knight trait", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-021", as: "host", under: ["BT13-016"] }], hand: [{ card: "BT6-082", as: "sistermon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT6-082")).toBe(true);
  });
});
