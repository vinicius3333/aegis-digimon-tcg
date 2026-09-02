import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-069.js";
import "./EX11-050.js";
import "./EX11-052.js";

describe("EX11-069 Yuuki", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-069")).toMatchObject({
      nameEn: "Yuuki",
      colors: ["Purple", "Red"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("trashes a hand card to gain memory at the start of the main phase", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-069", as: "yuuki" }], hand: ["BT1-001"] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yuuki"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
    assertNoLoudGap(s);
  });

  it("evolves only the attacking Digimon from trash, pays the cost reduced by 1, and is once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-069", as: "yuuki" },
            { card: "EX11-049", as: "attacker" },
            { card: "EX11-049", as: "other" },
          ],
          trash: [
            { card: "EX11-050", as: "firstEvolution" },
            { card: "EX11-052", as: "secondEvolution" },
          ],
        },
      },
      // EX11-050 matches EX11-049 on BOTH its printed evoCost (Purple/Red Lv.4, cost 4) and its
      // alternate requirement (Lv.4 [Dark Dragon]/[Evil Dragon], cost 3), so the interpreter opens
      // the route `chooseOption` prompt (digivolve.ts). Answer it with the printed route
      // (index 0): 4 - 1 = 3 memory.
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    const attack = { attackerPermanentId: s.perm("attacker").permanentId };
    await advance(s.engine).fireSubTrigger("whenAttacking", attack);
    await advance(s.engine).fireSubTrigger("whenAttacking", attack);

    expect(s.perm("attacker").topCard.cardId).toBe("EX11-050");
    expect(s.perm("other").topCard.cardId).toBe("EX11-049");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-052");
    assertNoLoudGap(s);
  });

  const attackSetup = (handSize: number) =>
    setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-069", as: "yuuki" },
            { card: "EX11-049", as: "attacker" },
          ],
          hand: Array.from({ length: handSize }, () => "BT1-090"),
          trash: [{ card: "EX11-050", as: "evolution" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );

  it("evolves at exactly 4 cards in hand", async () => {
    const s = attackSetup(4);
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });

    expect(s.perm("attacker").topCard.cardId).toBe("EX11-050");
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("does not evolve at 5 cards in hand", async () => {
    const s = attackSetup(5);
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });

    expect(s.perm("attacker").topCard.cardId).toBe("EX11-049");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-050");
    assertNoLoudGap(s);
  });

  it("does not return a trash card at end of all turns with 5 cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-069", as: "yuuki" }],
          hand: Array.from({ length: 5 }, () => "BT1-090"),
          trash: [{ card: "EX11-050", as: "darkDragon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("yuuki"));

    expect(s.perm("yuuki").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-050");
    assertNoLoudGap(s);
  });

  it("suspends itself to return an eligible trait card at end of all turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-069", as: "yuuki" }],
          trash: [{ card: "EX11-050", as: "darkDragon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("yuuki"));

    expect(s.perm("yuuki").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX11-050"]);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with trigger-subject evolution and no retroactive end trigger (Q5939)", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        actions: [
          {
            kind: "Digivolve",
            target: { sourceRef: "triggerSubject" },
            from: ["trash"],
            payCost: true,
            reduceCost: 1,
          },
        ],
      },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "EndOfAllTurns")).toHaveLength(1);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });

  it("does not retroactively trigger after its Security effect plays it following end-of-turn timing (Q5939)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX11-069", as: "securityYuuki", faceUp: true }],
          trash: [{ card: "EX11-050", as: "darkDragon" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityYuuki"));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX11-069");
    expect(played?.isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-050");
    assertNoLoudGap(s);
  });
});
