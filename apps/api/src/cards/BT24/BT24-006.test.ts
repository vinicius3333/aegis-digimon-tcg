import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
    });
    expect(inherited.actions[0].actions).toMatchObject([
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

  it("reaches Tapmon through a legal purple egg-to-Appmon evolution stack", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-006", as: "egg" },
        hand: [
          { card: "BT24-067", as: "hackmon" },
          { card: "BT24-053", as: "link" },
          { card: "BT4-022", as: "startingHand" },
        ],
        deck: [{ card: "BT4-022", as: "drawn" }, "BT4-022", "BT4-022", "BT4-022", "BT4-022"],
      },
      1: { deck: ["BT4-022", "BT4-022", "BT4-022", "BT4-022", "BT4-022"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
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
    expect(s.engine.applyIntent(0, {
      type: "linkCard",
      instanceId: s.inst("link").instanceId,
      targetPermanentId: s.perm("egg").permanentId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("startingHand").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    await settle(() => s.decisions.length === 0, 1000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });
});
