import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-026.js";

describe("BT15-026", () => {
  it("publishes Blast Digivolve at Counter Timing", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    }));

  it("draws and may trash a hand card when played or digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", condition: { kind: "zoneCount", value: 5 } },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }],
    });
  });
  it("once per turn restricts an opposing Digimon or Tamer after your Digimon effect adds to hand", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          fireCondition: { kind: "triggerByYourDigimonEffect" },
          actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }],
        },
      ],
    }));

  it("after its On Play draw reaches 5 cards, trashes one yet still locks a Tamer per Q2507", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT15-026", as: "wereGarurumon" },
            { card: "BT1-009", as: "keptOne" },
            { card: "BT1-009", as: "keptTwo" },
            { card: "BT1-009", as: "keptThree" },
            { card: "BT1-009", as: "keptFour" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-086", as: "tamerTarget" },
            { card: "BT1-009", as: "digimonPeer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wereGarurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 1 &&
        observe(s.engine).isRestricted(s.perm("tamerTarget"), "suspend"),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("tamerTarget"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("digimonPeer"), "suspend")).toBe(false);
  });

  it("when digivolving below the threshold, draws without trashing and locks one Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-025", as: "base" }],
          hand: [
            { card: "BT15-026", as: "wereGarurumon" },
            { card: "BT1-009", as: "keptOne" },
            { card: "BT1-009", as: "keptTwo" },
          ],
          deck: [
            { card: "BT1-001", as: "normalDraw" },
            { card: "BT1-009", as: "effectDraw" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("wereGarurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("effectDraw").instanceId) &&
        observe(s.engine).isRestricted(s.perm("target"), "suspend"),
    );

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("Blast Digivolves from hand during Counter Timing without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT15-025", as: "base" }],
          hand: [{ card: "BT15-026", as: "wereGarurumon" }],
          deck: ["BT1-001", "BT1-009"],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("wereGarurumon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-026");

    expect(s.state.memory).toBe(0);
  });

  it("loses 3 memory to Overflow when it leaves the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT15-026", as: "wereGarurumon" }] } });
    s.state.memory = 0;
    await s.ready();
    const sourceId = s.perm("wereGarurumon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId])).toBe(1);
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId));

    expect(s.state.memory).toBe(-3);
  });
});
