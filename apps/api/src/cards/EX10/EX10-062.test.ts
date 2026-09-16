import { getCardDefinition, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-062.js";
import "../index.js";

const CARD_ID = "EX10-062";

function singleMemoryGains(events: ServerEvent[]): number {
  return events.filter((event) => event.kind === "memoryChanged" && event.to - event.from === 1).length;
}

async function answerOptionals(s: EngineSetup, plan: boolean[]): Promise<void> {
  let handled = 0;
  for (const accept of plan) {
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length > handled);
    const pending = s.decisions.filter(({ req }) => req.kind === "optional")[handled];
    if (pending === undefined) return;
    handled += 1;
    s.engine.applyIntent(pending.seat, {
      type: "respondDecision",
      decisionId: pending.req.decisionId,
      response: { kind: "optional", accept },
    });
  }
}

function linkTrashBoard(tamerZone: "battleArea" | "trash" | "hand") {
  return {
    0: {
      battleArea: [
        ...(tamerZone === "battleArea" ? [{ card: CARD_ID, as: "tamer" }] : []),
        { card: "BT1-009", as: "host", linked: [{ card: "BT1-009", as: "linkCard" }] },
      ],
      hand: [{ card: "BT25-073", as: "dragomon" }, ...(tamerZone === "hand" ? [{ card: CARD_ID, as: "tamer" }] : [])],
      trash: tamerZone === "trash" ? [{ card: CARD_ID, as: "tamer" }] : [],
      deck: ["BT1-013", "BT1-014"],
    },
  };
}

describe("EX10-062 Yujin Ozora", () => {
  it("matches the catalog and compiles all four printed clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX10",
      nameEn: "Yujin Ozora",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["App Driver", "Appmon", "Leviathan"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourMainPhase",
          actions: [expect.objectContaining({ kind: "GainMemory", amount: 1 })],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenLinkTrashed",
              sourceFilter: { controller: "mine", kind: ["Digimon"] },
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "EndOfYourTurn",
          frequency: "OncePerTurn",
          actions: [expect.objectContaining({ kind: "AppFuse", from: ["hand"], optional: true })],
        }),
        expect.objectContaining({ trigger: "Security", isSecurity: true }),
      ]),
    );
  });

  it("gains exactly 1 memory at the start of its controller's Main phase while the opponent has a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "enemy" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 0;
    const before = s.events.length;

    await advance(s.engine).runTurn(0);

    expect(singleMemoryGains(s.events.slice(before))).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("gains nothing when the opponent's only permanent is a Tamer, not a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: CARD_ID, as: "enemyTamer" }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 0;
    const before = s.events.length;

    await advance(s.engine).runTurn(0);

    expect(singleMemoryGains(s.events.slice(before))).toBe(0);
  });

  it("stays silent at the start of the OPPONENT's Main phase", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "tamer" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "enemy" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const before = s.events.length;

    await advance(s.engine).runTurn(1);

    expect(singleMemoryGains(s.events.slice(before))).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID)).toBe(true);
  });

  it("suspends the Tamer and draws 1 when an effect trashes one of your Digimon's link cards", async () => {
    const s = setupEngine(linkTrashBoard("battleArea"), { autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const handBefore = p0.hand.length;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, [true, true]);
    await settle(() => p0.hand.some(({ cardId }) => cardId === "BT1-013"));
    await s.ready();

    expect(s.perm("host").linked).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(linkCardId);
    expect(p0.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013"]);
    expect(p0.hand).toHaveLength(handBefore);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws nothing and leaves the Tamer unsuspended when the suspend cost is declined", async () => {
    const s = setupEngine(linkTrashBoard("battleArea"), { autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const linkCardId = s.inst("linkCard").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, [true, false]);
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === linkCardId));
    await settle(() => false, 30);
    await s.ready();

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(p0.hand).toHaveLength(0);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire for an OPPONENT's Digimon's link card ('any of YOUR Digimon's')", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "tamer" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "enemyHost", linked: [{ card: "BT1-009", as: "enemyLink" }] }],
          hand: [{ card: "BT25-073", as: "dragomon" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const p0 = s.state.players[0]!;
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
      ok: true,
    });
    await answerOptionals(s, [true]);
    await settle(() => s.perm("enemyHost").linked.length === 0);
    await settle(() => false, 30);
    await s.ready();

    expect(s.perm("enemyHost").linked).toHaveLength(0);
    expect(p0.hand).toHaveLength(0);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it("Q5172: a link card replaced by the link-limit rule sweep is not an effect trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "tamer" },
          { card: "BT23-007", as: "host" },
        ],
        hand: [
          { card: "BT23-007", as: "firstLink" },
          { card: "BT24-053", as: "secondLink" },
        ],
        deck: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();
    const p0 = s.state.players[0]!;
    s.state.memory = 10;
    const firstLinkId = s.inst("firstLink").instanceId;
    const secondLinkId = s.inst("secondLink").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: firstLinkId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some(({ instanceId }) => instanceId === firstLinkId));
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([firstLinkId]);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: secondLinkId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.some(({ instanceId }) => instanceId === firstLinkId));
    await settle(() => false, 30);
    await s.ready();

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([secondLinkId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toContain(firstLinkId);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(p0.hand).toHaveLength(0);
    expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });

  it.each(["trash", "hand"] as const)(
    "is inert while it sits in the %s: no draw on a link trash and no start-of-main memory",
    async (zone) => {
      const s = setupEngine(linkTrashBoard(zone), { autoSelectCards: true, autoChooseOption: true });
      await s.ready();
      const p0 = s.state.players[0]!;
      s.state.memory = 10;
      const handBefore = p0.hand.length;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragomon").instanceId })).toEqual({
        ok: true,
      });
      await answerOptionals(s, [true]);
      await settle(() => s.perm("host").linked.length === 0);
      await settle(() => false, 30);
      await s.ready();

      expect(p0.hand).toHaveLength(handBefore - 1);
      expect(p0.deck.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
      expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(1);

      s.putOnBoard(1, { card: "BT1-009", as: "enemy" });
      await s.ready();
      s.state.memory = 0;
      const before = s.events.length;
      await advance(s.engine).runTurn(0);
      expect(singleMemoryGains(s.events.slice(before))).toBe(0);
    },
  );

  it("app fuses one Digimon into a hand card at the end of its controller's turn, once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tamer" },
            { card: "EX10-017", as: "firstHost", linked: [{ card: "EX10-043", as: "firstSakusimon" }] },
            { card: "EX10-017", as: "secondHost", linked: [{ card: "EX10-043", as: "secondSakusimon" }] },
          ],
          hand: [
            { card: "EX10-019", as: "firstWarudamon" },
            { card: "EX10-019", as: "secondWarudamon" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: [{ card: "BT1-009", as: "theirSpare" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstHost").topCard!.instanceId, s.inst("firstWarudamon").instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.perm("firstHost").topCard?.cardId === "EX10-019");

    expect(s.perm("firstHost").topCard?.instanceId).toBe(s.inst("firstWarudamon").instanceId);
    expect(s.perm("firstHost").stack.map(({ cardId }) => cardId)).toEqual(["EX10-043"]);
    expect(s.perm("firstHost").linked.map(({ cardId }) => cardId)).toEqual(["EX10-017"]);
    expect(s.perm("secondHost").topCard?.cardId).toBe("EX10-017");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondWarudamon").instanceId,
    );

    preferred.length = 0;
    preferred.push(s.perm("secondHost").topCard!.instanceId, s.inst("secondWarudamon").instanceId);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.turnSeat === 0);
    expect(s.perm("secondHost").topCard?.cardId).toBe("EX10-017");

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.perm("secondHost").topCard?.cardId === "EX10-019");

    expect(s.perm("secondHost").topCard?.instanceId).toBe(s.inst("secondWarudamon").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(
      s.inst("secondWarudamon").instanceId,
    );

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Security] plays itself into the battle area without paying its 3 cost", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: CARD_ID, as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    const tamerId = s.inst("tamer").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === tamerId));
    await s.ready();

    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === tamerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === tamerId)).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
