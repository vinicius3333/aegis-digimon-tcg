import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-063.js";

describe("EX11-063 Winr", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-063")).toMatchObject({
      nameEn: "Winr",
      colors: ["Green", "Black"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-063", as: "winr" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("winr"));
    expect(s.state.memory).toBe(3);
    assertNoLoudGap(s);
  });

  it("places a Royal Base card face up at security bottom even from zero security (Q5922-Q5926)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-063", as: "winr" }],
          hand: [{ card: "EX11-025", as: "royalBase" }],
          security: [],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("winr"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX11-025", faceUp: true });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("binds one Royal Base Digimon, grants both keywords, and makes it attack (Q5927)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-063", as: "winr" },
            { card: "EX11-025", as: "attacker" },
          ],
        },
        1: { security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("winr"));

    expect(s.perm("winr").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
    expect(
      s.events.some(
        (event) =>
          (event as { kind?: string }).kind === "attackDeclared" &&
          (event as { attackerPermanentId?: string }).attackerPermanentId === s.perm("attacker").permanentId,
      ),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with one binding shared by both grants and the attack", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions).toMatchObject([
      { kind: "SelectBind", target: { bindAs: "buffedDigimon" }, cost: { kind: "suspend" } },
      { kind: "GainKeyword", target: { fromSelectionRef: "buffedDigimon" } },
      { kind: "GainKeyword", target: { fromSelectionRef: "buffedDigimon" } },
      { kind: "Attack", target: { fromSelectionRef: "buffedDigimon" }, optional: false },
    ]);
  });
});
