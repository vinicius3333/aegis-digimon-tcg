import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-006.js";
import "../index.js";

describe("BT24-006 Tapmon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-006")).toMatchObject({
      cardId: "BT24-006",
      nameEn: "Tapmon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      types: ["Tap"],
    });
  });

  it("draws one and trashes one hand card when linked", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited);
    expect(inherited).toBeDefined();
    if (inherited === undefined) throw new Error("missing inherited effect");
    expect(inherited.frequency).toBe("OncePerTurn");
    const subTrigger = inherited.actions[0];
    if (subTrigger === undefined || subTrigger.kind !== "SubTrigger") throw new Error("missing link subtrigger");
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
    });
    expect(subTrigger.actions).toMatchObject([
      { kind: "Draw", amount: 1 },
      { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
    ]);
  });

  it("draws then trashes once only when this evolution stack gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: ["BT24-006"] },
            { card: "BT1-009", as: "otherHost" },
          ],
          hand: [{ card: "BT4-022", as: "startingHand" }],
          deck: [{ card: "BT4-022", as: "drawn" }, "BT4-022"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("otherHost").permanentId,
    });
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("startingHand").instanceId]);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("startingHand").instanceId]);
  });

  it("fires from the public link intent when another Appmon is linked to this host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: ["BT24-006"] }],
          hand: [
            { card: "BT24-053", as: "link" },
            { card: "BT4-022", as: "startingHand" },
          ],
          deck: [{ card: "BT4-022", as: "drawn" }, "BT4-022"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("suppresses a second link in the owner turn and resets on the next owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", under: ["BT24-006"] }],
          hand: [
            { card: "BT4-022", as: "filler" },
            { card: "BT24-053", as: "link1" },
            { card: "BT24-053", as: "link2" },
            { card: "BT24-053", as: "link3" },
          ],
          deck: [
            { card: "BT4-022", as: "draw1" },
            { card: "BT4-022", as: "draw2" },
            { card: "BT4-022", as: "draw3" },
          ],
        },
        1: { deck: ["BT4-022", "BT4-022"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link1").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("filler").instanceId));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("draw2").instanceId,
      s.inst("draw3").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("draw1").instanceId);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("link1").instanceId]);
    expect(s.state.memory).toBe(9);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link2").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked[0]?.instanceId === s.inst("link2").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("link1").instanceId);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("link2").instanceId]);
    expect(s.state.memory).toBe(8);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link3").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("link3").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("link2").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("draw2").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("draw3").instanceId);
    expect(s.state.memory).toBe(9);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("reaches Tapmon through a legal purple egg-to-Appmon evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-006", as: "egg" },
          hand: [
            { card: "BT24-067", as: "hackmon" },
            { card: "BT24-053", as: "link" },
            { card: "BT4-022", as: "startingHand" },
          ],
          deck: [
            { card: "BT4-022", as: "drawn" },
            { card: "BT4-022", as: "drawDeck2" },
            { card: "BT4-022", as: "drawDeck3" },
            { card: "BT4-022", as: "drawDeck4" },
            { card: "BT4-022", as: "drawDeck5" },
          ],
        },
        1: { deck: ["BT4-022", "BT4-022", "BT4-022", "BT4-022", "BT4-022"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const eggId = s.perm("egg").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggId,
        instanceId: s.inst("hackmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT24-067");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("drawDeck2").instanceId,
      s.inst("drawDeck3").instanceId,
      s.inst("drawDeck4").instanceId,
      s.inst("drawDeck5").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT24-006"]);
    const setupTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await setupTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggId })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !internalsOf(s.engine).mainEntryPending);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("egg").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("startingHand").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
    await settle(() => s.decisions.length === 0, 1000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });
});
