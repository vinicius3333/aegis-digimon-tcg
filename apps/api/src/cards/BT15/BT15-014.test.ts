import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-014.js";

describe("BT15-014", () => {
  it("registers the printed Blast Digivolve marker", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    }));

  it("plays a red Tamer costing 4 or less on play and when digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", payCost: false, optional: true }],
    });
  });
  it("once per turn deletes an opposing Blocker when one of your Tamers is played", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "Delete", target: { filter: { keywords: ["Blocker"] } } }],
        },
      ],
    }));

  it("plays a cost-4 red Tamer free on play and deletes only the opposing Blocker", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT15-014", as: "garudamon" },
            { card: "BT15-082", as: "sora" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-072", as: "blocker" },
            { card: "BT1-009", as: "nonBlocker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const blockerId = s.perm("blocker").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === blockerId));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-082")).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("nonBlocker").permanentId,
    ]);
  });

  it("plays the red Tamer free when digivolving and pays only the normal evolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-013", as: "base" }],
          hand: [
            { card: "BT15-014", as: "garudamon" },
            { card: "BT15-082", as: "sora" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT15-082"));

    expect(s.perm("base").topCard.cardId).toBe("BT15-014");
    expect(s.state.memory).toBe(2);
  });

  it("Blast Digivolves from hand during Counter Timing without paying memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      1: {
        battleArea: [{ card: "BT15-013", as: "base" }],
        hand: [{ card: "BT15-014", as: "garudamon" }],
        security: ["BT1-001"],
      },
    });
    s.state.memory = 0;
    s.state.turnSeat = 0;

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
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("garudamon").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT15-014");

    expect(s.state.memory).toBe(0);
  });

  it("loses 3 memory to Overflow when it leaves the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT15-014", as: "garudamon" }] } });
    s.state.memory = 0;
    await s.ready();
    const sourceId = s.perm("garudamon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId])).toBe(1);
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId));

    expect(s.state.memory).toBe(-3);
  });
});
