import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-053.js";
import { answerRevealSlotsRejectingEmpty } from "./livePlayTestHelpers.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT16/BT16-015.js";

describe("EX4-053 Falcomon", () => {
  it("matches the catalog and is registered as complete IR", () => {
    expect(getCardDefinition("EX4-053")).toMatchObject({
      cardId: "EX4-053",
      nameEn: "Falcomon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Avian"],
      effectText: expect.stringContaining("[Keenan Crier]"),
      inheritedEffectText: expect.stringContaining("deleted outside of a battle"),
    });
    expect(runtimeCompiledCard("EX4-053")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("reveals three and adds purple Ravemon/Bird/Avian plus Keenan Crier", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: {
            colors: ["Purple"],
            nameOrTrait: [
              { match: "name", tokens: ["Ravemon"] },
              { match: "traitContains", tokens: ["Bird", "Avian"] },
            ],
          },
        },
        { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Keenan Crier"] }] } },
      ],
    });
  });
  it("inherits hand trashing only when deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("publicly adds both matching On Play cards and bottoms the nonmatching reveal", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-053", as: "source" }],
          deck: ["EX4-058", "EX4-064", "EX4-054"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX4-053") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX4-058") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX4-064"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX4-058", "EX4-064"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX4-054"]);
    expect(s.state.memory).toBe(0);
  });

  it("counts a card whose trait only contains [Bird] (e.g. [Giant Bird])", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-053", as: "source" }],
          deck: ["BT3-080", "EX4-064", "EX4-054"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT3-080", "EX4-064"]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX4-054"]);
  });

  it("adds Yoshino Fujieda & Keenan Crier as Keenan Crier through its name rule", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-053", as: "source" }],
          deck: ["ST24-14", "BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "ST24-14"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["ST24-14"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-010"]);
  });

  it("does not trash an opponent hand card when the inherited host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-054", dp: 1000, suspended: true, as: "host", under: ["EX4-053"] }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "opponentCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("trashes exactly one opponent hand card when the inherited host is deleted outside battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-054", dp: 1000, as: "host", under: ["EX4-053"] }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "redSource" }],
          hand: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-011", as: "second" },
            { card: "EX4-065", as: "tridentGaia" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("tridentGaia").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("host").instanceId) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("first").instanceId),
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("tridentGaia").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.trash.filter((card) =>
        [s.inst("first").instanceId, s.inst("second").instanceId].includes(card.instanceId),
      ),
    ).toHaveLength(1);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("second").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("first").instanceId);
  });
  ex4CardBehaviorTests("EX4-053");
});

describe("EX4-053 Falcomon — KB Q&A rulings", () => {
  it("must add a card to each slot that has a revealed match (Q3496)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-053", as: "subject" }],
          deck: [
            { card: "EX4-058", as: "ravemon" },
            { card: "EX4-064", as: "keenan" },
            { card: "EX4-054", as: "miss" },
          ],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await answerRevealSlotsRejectingEmpty(s, 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("ravemon").instanceId, s.inst("keenan").instanceId].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("miss").instanceId);
  });

  it("adds the single revealed target when only one slot matches (Q3495)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX4-053", as: "subject" }],
          deck: [{ card: "EX4-064", as: "keenan" }, "EX4-054", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("keenan").instanceId]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-010", "EX4-054"]);
  });

  it("does not make the opponent trash when Phoenixmon (X Antibody) runs On Deletion effects at End of Attack (Q2614)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-015", as: "phoenix", under: ["EX4-053", "BT2-019"] }] },
        1: { hand: ["BT1-010", "BT1-011"], security: ["BT1-010"], deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenix").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const triggeredSources = s.events
      .filter((event) => event.kind === "effectTriggered")
      .map((event) => (event as { sourceCardId?: string }).sourceCardId);
    expect(triggeredSources).toContain("BT16-015");
    expect(triggeredSources).not.toContain("EX4-053");
    expect(s.decisions.some(({ seat, req }) => seat === 1 && req.kind === "selectCards")).toBe(false);
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
