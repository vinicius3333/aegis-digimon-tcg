import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT20-008.js";

describe("BT20-008 Huckmon", () => {
  it("requires the printed trash cost before draw and memory, then buffs all allied Digimon", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(main?.actions[0]).toMatchObject({ kind: "Draw", cost: { kind: "trash" } });
    expect(main?.actions[0]).toMatchObject({ optional: true, abortOnDecline: true });
    expect(main?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(main?.actions[1]?.optional).not.toBe(true);
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      target: { count: "all" },
    });
  });

  it("optionally trashes one matching name/trait card, then draws and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-008", as: "huckmon" }],
          hand: [
            { card: "BT20-084", as: "nameMatch" },
            { card: "BT20-010", as: "nonMatch" },
            { card: "BT20-045", as: "traitMatch" },
          ],
          deck: [{ card: "BT20-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("huckmon"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("nameMatch").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonMatch").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("traitMatch").instanceId);
    expect(s.state.memory).toBe(1);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-008", as: "huckmon" }],
          hand: [{ card: "BT20-045", as: "cost" }],
          deck: [
            { card: "BT20-010", as: "turnTop" },
            { card: "BT20-011", as: "top" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.OnStartMainPhase, declined.perm("huckmon"));
    expect(declined.state.players[0]!.hand.map((card) => card.instanceId)).toContain(declined.inst("cost").instanceId);
    expect(declined.state.players[0]!.deck.map((card) => card.instanceId)).toContain(declined.inst("top").instanceId);
    expect(declined.state.memory).toBe(0);
  });

  it("observably buffs every allied Digimon and no opponent only during its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-012", dp: 4000, as: "host", under: ["BT20-001", "BT20-008"] },
          { card: "BT20-010", dp: 1000, as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT20-010", dp: 1000, as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("ally").currentDP).toBe(2000);
    expect(s.perm("opponent").currentDP).toBe(1000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(4000);
    expect(s.perm("ally").currentDP).toBe(1000);
  });

  it("accepts the Royal Knight trait alternative independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-008", as: "huckmon" }],
          hand: [
            { card: "BT20-045", as: "royalKnight" },
            { card: "BT20-010", as: "nonMatch" },
          ],
          deck: [
            { card: "BT20-010", as: "turnDraw" },
            { card: "BT20-011", as: "drawn" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("huckmon"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("royalKnight").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonMatch").instanceId);
  });

  it("resolves naturally on the first player's main phase and preserves the second deck card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-008", as: "huckmon" }],
          hand: [{ card: "BT20-084", as: "payment" }],
          deck: [
            { card: "BT20-010", as: "effectDraw" },
            { card: "BT20-011", as: "untouched" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId));
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("effectDraw").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("untouched").instanceId);
  });

  it("reaches Huckmon from a DemiVeemon egg through a public evolution intent", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT20-001", as: "egg" }, hand: [{ card: "BT20-008", as: "huckmon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("huckmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT20-008");
    expect(s.perm("egg").topCard.cardId).toBe("BT20-008");
  });

  it.each([
    ["Huckmon name", "BT20-008"],
    ["Sistermon name", "BT20-084"],
    ["Royal Knight trait", "BT20-045"],
  ])("naturally selects the %s payment and then draws and gains memory", async (_label, paymentCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-008", as: "huckmon" }],
          hand: [{ card: paymentCard, as: "payment" }],
          deck: [
            { card: "BT20-010", as: "drawn" },
            { card: "BT20-011", as: "untouched" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("payment").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("naturally refuses the optional payment without drawing or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-008", as: "huckmon" }],
          hand: [{ card: "BT20-084", as: "payment" }],
          deck: [{ card: "BT20-010", as: "top" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await Promise.resolve();
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("payment").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
  });

  it("naturally leaves a no-match hand unchanged without drawing or gaining memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT20-008", as: "huckmon" }],
        hand: [{ card: "BT20-010", as: "nonMatch" }],
        deck: [{ card: "BT20-011", as: "top" }],
      },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonMatch").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("top").instanceId);
  });
});
