import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-099.js";

describe("BT23-099 Sistermon Sisters Training Gym", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-099")).toMatchObject({
      cardId: "BT23-099",
      nameEn: "The Sistermon Sisters Training Gym",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 2,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays Delay on a Huckmon evolution and free-plays Sistermon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-099", as: "option" },
            { card: "ST12-04", as: "base" },
          ],
          hand: [
            { card: "BT6-011", as: "baohuckmon" },
            { card: "BT23-076", as: "sistermon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const sistermonId = s.inst("sistermon").instanceId;
    s.perm("option").placedByEffect = true;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("baohuckmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === sistermonId)).toBe(
      true,
    );
    expect(s.perm("base").topCard?.cardId).toBe("BT6-011");
    // Only the digivolution cost of 2 was paid: the 3-cost Sistermon Blanc came for free.
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not consume Delay for a digivolution into a non-Huckmon/non-Jesmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-099", as: "option" },
            { card: "BT23-005", as: "base" },
          ],
          hand: [
            { card: "BT23-011", as: "birdramon" },
            { card: "BT23-076", as: "sistermon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const sistermonId = s.inst("sistermon").instanceId;
    s.perm("option").placedByEffect = true;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("birdramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT23-011");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sistermonId)).toBe(true);
  });

  it("ignores an opponent's public Huckmon evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-099", as: "option" }],
          hand: [{ card: "BT23-076", as: "sistermon" }],
        },
        1: {
          battleArea: [{ card: "ST12-04", as: "base" }],
          hand: [{ card: "BT6-011", as: "baohuckmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const sistermonId = s.inst("sistermon").instanceId;
    s.perm("option").placedByEffect = true;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("baohuckmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT6-011");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === sistermonId)).toBe(true);
  });

  it("grants color waiving with Huckmon on the field and places itself after drawing", () => {
    const waive = compiled.effects[0]?.actions?.[0] as any;
    expect(waive.condition.filter.zone).toEqual(["battleArea", "breeding"]);
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    expect(main.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlaceInBattleAreaSelf" }]);
  });

  it("waives the white color requirement from an off-color Huckmon in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT23-006", as: "huckmonInBreeding" },
        hand: [{ card: "BT23-099", as: "option" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("activates Delay on Huckmon/Jesmon digivolution with the printed Sistermon play payload", () => {
    const arm = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(arm.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
    expect(arm.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(arm.actions[0].actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      optional: true,
    });
  });

  it("keeps the Security play optional but places the option in battle mandatorily", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true });
    expect(security.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });
  });

  it("draws 1 and places itself in the battle area when played from hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-076", as: "blanc" }],
        hand: [{ card: "BT23-099", as: "option" }],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    // <Draw 1> took exactly the top card of the deck.
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    // Then the option itself sits in the battle area rather than the trash.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    // Its printed cost of 2 was paid.
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the off-color play without a Huckmon and allows it once one is on the field", async () => {
    const s = setupEngine({
      0: {
        // A red Digimon with no [Huckmon] in its name: no white source, no waiver.
        battleArea: [{ card: "BT1-009", as: "monodramon" }],
        hand: [{ card: "BT23-099", as: "option" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    const optionId = s.inst("option").instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(optionId);

    s.putOnBoard(0, { card: "ST12-04", as: "huckmon" });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("pays Delay on a Jesmon evolution and free-plays Sistermon Ciel from the trash under its granted name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-099", as: "option" },
            { card: "ST12-08", as: "base" },
          ],
          hand: [{ card: "ST12-10", as: "jesmon" }],
          trash: [{ card: "BT23-077", as: "ciel" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const cielId = s.inst("ciel").instanceId;
    s.perm("option").placedByEffect = true;
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === cielId));

    expect(s.perm("base").topCard?.cardId).toBe("ST12-10");
    const ciel = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === cielId)!;
    expect(ciel).toBeDefined();
    // The 4-cost Ciel left the trash without paying: only the digivolution cost moved memory.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === cielId)).toBe(false);
    // BT23-077 carries the (Rule) alias, so it answers to [Sistermon Noir] as well.
    expect(observe(s.engine).grantedNames(ciel)).toEqual(["sistermon noir"]);
    expect(observe(s.engine).effectiveNames(ciel)).toEqual(
      expect.arrayContaining(["sistermon ciel", "sistermon noir"]),
    );
    // The Delay was consumed: the option is in the trash.
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("keeps the option on the field when the Delay play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-099", as: "option" },
            { card: "ST12-04", as: "base" },
          ],
          hand: [
            { card: "BT6-011", as: "baohuckmon" },
            { card: "BT23-076", as: "sistermon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const sistermonId = s.inst("sistermon").instanceId;
    s.perm("option").placedByEffect = true;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("baohuckmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT6-011");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(sistermonId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("free-plays a Sistermon from hand and stays in the battle area when checked from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT23-099", as: "option" }],
          hand: [{ card: "BT6-082", as: "blanc" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: ["BT1-010", "BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const blancId = s.inst("blanc").instanceId;
    s.state.turnSeat = 1;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    // The turn start hands seat 1 its 3 memory; take that as the baseline.
    // Keep seat 1 off zero so the attack does not also end the turn.
    s.state.memory = 3;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === blancId));

    // The 3-cost Sistermon Blanc arrived from hand without paying.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === blancId)).toBe(true);
    // No playCard memory movement: the printed 3-cost was never paid.
    expect(
      s.events.filter((event) => event.kind === "memoryChanged" && "reason" in event && event.reason === "playCard"),
    ).toEqual([]);
    expect(s.state.memory).toBe(memoryBefore);
    // "Then, place this card in the battle area" — the checked option is not trashed.
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
