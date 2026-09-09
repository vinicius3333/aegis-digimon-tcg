import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-035.js";
import "../BT1/BT1-102.js";
import "../BT10/BT10-105.js";
import "../P/P-146.js";
import "./index.js";

describe("BT17-035 Taomon", () => {
  it("may use a Plug-In or yellow Option from hand at 2 less on digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      optional: true,
      allowMultiColor: true,
      filter: {
        controller: "mine",
        kind: ["Option"],
        playCostLte: 99,
        or: [{ nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }] }, { colors: ["Yellow"] }],
      },
    });
  });

  it("once per turn inherits the same use only when this Digimon has Sakuyamon in its name", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "UseOptionWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }],
    });
    expect(effect!.actions[0]).toMatchObject({ condition: { kind: "selfHasNameContaining", names: ["Sakuyamon"] } });
  });

  it("has Barrier and uses a legal yellow Option for 2 less when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", as: "base" }],
          hand: [
            { card: "BT17-035", as: "taomon" },
            { card: "BT1-102", as: "option" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const baseId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    // Digivolve cost 3 (Yellow Lv4 -> Lv5) leaves 0; BT1-102 costs 2, reduced by 2 to free.
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT17-035");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Barrier")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the reduced-cost Option from a Sakuyamon host when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [{ card: "BT1-102", as: "option" }],
          deck: [{ card: "BT1-011", as: "drawn" }],
          security: [
            { card: "BT1-012", as: "sec1" },
            { card: "BT1-012", as: "sec2" },
          ],
        },
        1: { security: [{ card: "BT1-012", as: "oppSec1" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
    // BT1-102 costs 2, reduced by 2: the use is free.
    expect(s.state.memory).toBe(memoryBefore);
  });

  it("uses a qualifying yellow Option above the runtime's historical cost-5 default", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-032", as: "base" },
            { card: "BT25-032", as: "glowingDawn" },
          ],
          hand: [
            { card: "BT5-102", as: "wrongOption" },
            { card: "BT17-035", as: "taomon" },
            { card: "BT25-043", as: "highCostYellowOption" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const wrongOptionId = s.inst("wrongOption").instanceId;
    const highCostOptionId = s.inst("highCostYellowOption").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === highCostOptionId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(highCostOptionId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(wrongOptionId);
    expect(s.state.memory).toBe(3);
  });

  it("cannot ignore an Option's colour requirements, per Q2785", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", as: "base" }],
          hand: [
            { card: "BT17-035", as: "taomon" },
            { card: "BT10-105", as: "blackPlugIn" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const blackPlugInId = s.inst("blackPlugIn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-035");
    await settle();

    // The only board colour is Yellow, so the black [Plug-In] Option's colour requirement is
    // unmet, and this card's effect does not waive it. It is the sole hand Option, so nothing
    // is used: the Option stays in hand and only the digivolve cost of 3 is paid.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(blackPlugInId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === blackPlugInId)).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses a same-cost yellow Option from the very fixture that refuses the black [Plug-In]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", as: "base" }],
          hand: [
            { card: "BT17-035", as: "taomon" },
            { card: "BT10-105", as: "blackPlugIn" },
            { card: "P-146", as: "yellowPlugIn" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const blackPlugInId = s.inst("blackPlugIn").instanceId;
    const yellowPlugInId = s.inst("yellowPlugIn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === yellowPlugInId));
    await settle();

    // P-146's [Main] places the used card as a bottom digivolution card, so it leaves the hand
    // for the stack rather than the trash.
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(yellowPlugInId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === yellowPlugInId)).toBe(false);
    // Digivolve 3 then P-146 (cost 3) reduced by 2 = 1: memory 6 - 3 - 1 = 2.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(blackPlugInId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not offer the inherited use when the host has no Sakuyamon in its name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", under: ["BT17-035"], as: "kyubimon" }],
          hand: [{ card: "BT1-102", as: "option" }],
          security: [{ card: "BT1-012", as: "sec1" }],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { security: [{ card: "BT1-012", as: "oppSec1" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kyubimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
  });

  it("uses the inherited attack effect only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [
            { card: "BT1-102", as: "firstOption" },
            { card: "BT1-102", as: "secondOption" },
          ],
          security: [{ card: "BT1-012", as: "sec1" }],
          deck: [
            { card: "BT1-011", as: "drawn1" },
            { card: "BT1-011", as: "drawn2" },
            { card: "BT1-011", as: "drawn3" },
          ],
        },
        1: {
          security: [
            { card: "BT1-012", as: "oppSec1" },
            { card: "BT1-012", as: "oppSec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstOptionId = s.inst("firstOption").instanceId;
    const secondOptionId = s.inst("secondOption").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === firstOptionId));
    expect(s.state.players[1]!.security).toHaveLength(1);

    await advance(s.engine).verb.unsuspend([s.perm("sakuyamon").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    // Same turn, second attack: the once-per-turn gate keeps the second Option in hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(secondOptionId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === secondOptionId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("resets the inherited once-per-turn use on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-038", under: ["BT17-035"], as: "sakuyamon" }],
          hand: [
            { card: "BT1-102", as: "firstOption" },
            { card: "BT1-102", as: "secondOption" },
            { card: "BT1-013", as: "spare" },
          ],
          security: [{ card: "BT1-012", as: "sec1" }],
          deck: ["BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "oppInert" }],
          hand: [{ card: "BT1-014", as: "oppSpare" }],
          security: [
            { card: "BT1-012", as: "oppSec1" },
            { card: "BT1-012", as: "oppSec2" },
            { card: "BT1-012", as: "oppSec3" },
          ],
          deck: ["BT1-011", "BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const firstOptionId = s.inst("firstOption").instanceId;
    const secondOptionId = s.inst("secondOption").instanceId;
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === firstOptionId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(secondOptionId);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    // New own turn: the once-per-turn gate has reset, so the second Option is used.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sakuyamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === secondOptionId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(secondOptionId);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
