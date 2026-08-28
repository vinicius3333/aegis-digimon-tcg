import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-099.js";
import "./LM-023.js";

describe("LM-023 Sakuyamon: Maid Mode", () => {
  it("places an eligible yellow Tamer from hand on top of security and reveals it, per Q4024/Q4025", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "LM-023", as: "maid" },
            { card: "AD1-019", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "AD1-019"), 2000);

    expect(s.state.players[0]!.security.at(0)?.cardId).toBe("AD1-019");
    expect(s.events.some((event) => event.kind === "cardRevealed")).toBe(true);
  });

  it("places a single-color Option with a cost of 5 or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-023", as: "maid" }],
          hand: [{ card: "BT1-091", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("maid"));
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-091"), 2000);

    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-091")).toBe(true);
  });

  it("places a printed-cost-9 Option whose hand use cost is reduced to 5, per Q5516", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-023", as: "maid" },
            "BT1-087",
            "BT1-087",
            "BT1-087",
            "BT1-087",
          ],
          hand: [{ card: "BT2-099", as: "reduced-option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // Glorious Burst has printed use cost 9, reduced by one for each of four
    // Yellow Tamers. Q5516 permits the resulting effective cost of 5.
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("maid"));
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT2-099"), 2000);

    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT2-099")).toBe(true);
  });

  it("does not project an automatic self-reducer past the Q5516 cost boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-023", as: "maid" }, "BT1-087", "BT1-087", "BT1-087"],
          hand: [{ card: "BT2-099", as: "too-expensive" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // Three Yellow Tamers reduce Glorious Burst from 9 to 6, so it remains ineligible.
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("maid"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT2-099")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-099")).toBe(true);
  });

  it("does not place an ineligible multicolor Option from hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "LM-023", as: "maid" },
            { card: "BT10-104", as: "invalid" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maid").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT10-104")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-104")).toBe(true);
  });

  it("does not place a single-color Option costing more than 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-023", as: "maid" }],
          hand: [{ card: "BT1-107", as: "expensive" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("maid"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-107")).toBe(true);
  });

  it("shrinks an opposing Digimon by 6000 when a card is added to either security stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-023", as: "maid" }] },
        1: { battleArea: [{ card: "BT1-080", as: "victim" }], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const printed = getCardDefinition("BT1-080")!.dp!;

    // The opponent's own stack growing arms the clause too — the text names "a security stack".
    await advance(s.engine).fireSubTrigger("whenAddSecurity", { addedToSecuritySeat: 1 });
    await settle(() => s.perm("victim").currentDP === printed - 6000, 2000);

    expect(s.perm("victim").currentDP).toBe(printed - 6000);
  });

  it("shrinks an opposing Digimon by 6000 when an Option is used, once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-023", as: "maid" }] },
        1: { battleArea: [{ card: "BT1-080", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const printed = getCardDefinition("BT1-080")!.dp!;

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {});
    await settle(() => s.perm("victim").currentDP === printed - 6000, 2000);
    expect(s.perm("victim").currentDP).toBe(printed - 6000);

    await advance(s.engine).fireSubTrigger("whenOptionUsed", {});
    await settle(() => s.state.pendingDecision === null);
    expect(s.perm("victim").currentDP).toBe(printed - 6000);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-023");
    const compiled = runtimeCompiledCard("LM-023");
    expect(definition?.nameEn).toBe("Sakuyamon: Maid Mode");
    expect(definition?.dp).toBe(11000);
    expect(definition?.isAce).toBe(true);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
    });
  });
});
