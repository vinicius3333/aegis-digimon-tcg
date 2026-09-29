import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-001.js";
import "./BT3-008.js";

describe("BT3-008 Zubamon", () => {
  it("adds RagnaLoardmon and a revealed Legend-Arms Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-008", as: "source" }],
          deck: [
            { card: "BT3-010", as: "legendArms" },
            { card: "BT3-019", as: "ragna" },
            "BT3-014",
            "BT3-015",
            "BT3-017",
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const added = [s.inst("ragna").instanceId, s.inst("legendArms").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(3);
  });

  it("adds only one card when the five-card reveal contains only RagnaLoardmon targets", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-008", as: "source" }],
          deck: [{ card: "BT3-019", as: "ragna" }, "BT3-014", "BT3-015", "BT3-017", "BT3-018"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ragna").instanceId));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("does not count a Legend-Arms Option toward the Digimon slot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-008", as: "source" }],
          deck: [{ card: "BT3-019", as: "ragna" }, { card: "EX6-065", as: "option" }, "BT3-014", "BT3-015", "BT3-017"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ragna").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("ragna").instanceId]);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("can add two revealed RagnaLoardmon cards when both satisfy the two categories", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-008", as: "source" }],
          deck: [
            { card: "BT3-019", as: "firstRagna" },
            { card: "BT3-019", as: "secondRagna" },
            "BT3-014",
            "BT3-015",
            "BT3-017",
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT3-019", "BT3-019"]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not activate On Play when Zubamon digivolves from its legal red level 2 route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-001", as: "base" }],
        hand: [{ card: "BT3-008", as: "source" }],
        deck: [{ card: "BT3-014", as: "drawn" }, { card: "BT3-019", as: "notAdded" }, "BT3-015", "BT3-017", "BT3-018"],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("source").instanceId);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("notAdded").instanceId)).toBe(true);
  });
});

function revealBoard(deck: { card: string; as?: string }[], opts: { autoSelectCards?: boolean } = {}) {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT3-008", as: "source" }],
        deck,
      },
    },
    opts,
  );
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
    ok: true,
  });
  return s;
}

type RevealSetup = ReturnType<typeof revealBoard>;

async function nextCardSelection(s: RevealSetup) {
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const decisionId = s.state.pendingDecision!.decisionId;
  return s.decisions.find(({ req }) => req.decisionId === decisionId)!.req;
}

function select(s: RevealSetup, decisionId: string, instanceIds: string[]) {
  return s.engine.applyIntent(0, {
    type: "respondDecision",
    decisionId,
    response: { kind: "selectCards", instanceIds },
  });
}

function handIds(s: RevealSetup) {
  return s.state.players[0]!.hand.map((card) => card.instanceId);
}

describe("BT3-008 Zubamon — KB Q&A rulings", () => {
  it("adds only 1 card when the reveal holds only RagnaLoardmon or only other Legend-Arms Digimon (Q1048)", async () => {
    const onlyRagna = revealBoard(
      [
        { card: "BT3-019", as: "ragna" },
        { card: "BT3-014" },
        { card: "BT3-015" },
        { card: "BT3-017" },
        { card: "BT3-018" },
      ],
      { autoSelectCards: true },
    );
    await settle(() => handIds(onlyRagna).includes(onlyRagna.inst("ragna").instanceId));
    await settle();
    expect(handIds(onlyRagna)).toEqual([onlyRagna.inst("ragna").instanceId]);
    expect(onlyRagna.state.players[0]!.deck).toHaveLength(4);

    const onlyLegendArms = revealBoard(
      [
        { card: "BT3-010", as: "firstZuba" },
        { card: "BT3-010", as: "secondZuba" },
        { card: "BT3-014" },
        { card: "BT3-015" },
        { card: "BT3-017" },
      ],
      { autoSelectCards: true },
    );
    await settle(() => onlyLegendArms.state.players[0]!.hand.length > 0);
    await settle();
    expect(onlyLegendArms.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT3-010"]);
    expect(onlyLegendArms.state.players[0]!.deck.filter((card) => card.cardId === "BT3-010")).toHaveLength(1);
    expect(onlyLegendArms.state.players[0]!.deck).toHaveLength(4);
  });

  it("adds both revealed RagnaLoardmon when each fills one of the two categories (Q1049)", async () => {
    const s = revealBoard([
      { card: "BT3-019", as: "firstRagna" },
      { card: "BT3-019", as: "secondRagna" },
      { card: "BT3-014" },
      { card: "BT3-015" },
      { card: "BT3-017" },
    ]);
    const first = s.inst("firstRagna").instanceId;
    const second = s.inst("secondRagna").instanceId;

    const legendArmsSlot = await nextCardSelection(s);
    expect(legendArmsSlot.options?.candidateInstanceIds).toEqual(expect.arrayContaining([first, second]));
    expect(select(s, legendArmsSlot.decisionId, [first])).toEqual({ ok: true });

    const ragnaSlot = await nextCardSelection(s);
    expect(ragnaSlot.options?.candidateInstanceIds).toEqual([second]);
    expect(ragnaSlot.options?.min).toBe(1);
    expect(select(s, ragnaSlot.decisionId, [second])).toEqual({ ok: true });

    await settle(() => handIds(s).length === 2);
    expect(handIds(s)).toEqual(expect.arrayContaining([first, second]));
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).not.toContain("BT3-019");
  });

  it("cannot keep only the other Legend-Arms card, but may keep the lone RagnaLoardmon as its Legend-Arms card (Q1050)", async () => {
    const ragnaAndZuba = [
      { card: "BT3-019", as: "ragna" },
      { card: "BT3-010", as: "zuba" },
      { card: "BT3-014" },
      { card: "BT3-015" },
      { card: "BT3-017" },
    ];

    const takesZuba = revealBoard(ragnaAndZuba);
    const ragna = takesZuba.inst("ragna").instanceId;
    const zuba = takesZuba.inst("zuba").instanceId;
    const zubaPick = await nextCardSelection(takesZuba);
    expect(zubaPick.options?.candidateInstanceIds).toEqual(expect.arrayContaining([ragna, zuba]));
    expect(zubaPick.options?.min).toBe(1);
    expect(select(takesZuba, zubaPick.decisionId, [zuba])).toEqual({ ok: true });
    const forcedRagna = await nextCardSelection(takesZuba);
    expect(forcedRagna.options?.candidateInstanceIds).toEqual([ragna]);
    expect(forcedRagna.options?.min).toBe(1);
    expect(select(takesZuba, forcedRagna.decisionId, [ragna])).toEqual({ ok: true });
    await settle(() => handIds(takesZuba).length === 2);
    expect(handIds(takesZuba)).toEqual(expect.arrayContaining([ragna, zuba]));
    expect(takesZuba.state.players[0]!.deck).toHaveLength(3);

    const takesRagnaAsLegendArms = revealBoard(ragnaAndZuba);
    const loneRagna = takesRagnaAsLegendArms.inst("ragna").instanceId;
    const returnedZuba = takesRagnaAsLegendArms.inst("zuba").instanceId;
    const ragnaPick = await nextCardSelection(takesRagnaAsLegendArms);
    expect(select(takesRagnaAsLegendArms, ragnaPick.decisionId, [loneRagna])).toEqual({ ok: true });
    await settle(() => handIds(takesRagnaAsLegendArms).includes(loneRagna));
    await settle();
    expect(takesRagnaAsLegendArms.state.pendingDecision).toBeUndefined();
    expect(handIds(takesRagnaAsLegendArms)).toEqual([loneRagna]);
    expect(takesRagnaAsLegendArms.state.players[0]!.deck.map((card) => card.instanceId)).toContain(returnedZuba);
    expect(takesRagnaAsLegendArms.state.players[0]!.deck).toHaveLength(4);
  });
});
