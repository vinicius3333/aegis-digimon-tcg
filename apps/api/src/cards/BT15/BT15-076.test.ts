import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-076.js";

describe("BT15-076", () => {
  it("offers this hand card as a Counter-time Digivolve destination", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          source: "triggerSource",
          payCost: false,
          optional: true,
          into: { cardId: "BT15-076", kind: ["Digimon"] },
        },
      ],
    });
  });

  it("may play a purple level 3 Digimon or Tamer from trash on play or digivolving", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    });
  });

  it("has the printed Blocker keyword", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
  });

  it("Blast Digivolves from hand at Counter Timing and plays a purple level 3 from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT15-075", as: "base" }],
          hand: [{ card: "BT15-076", as: "myotismon" }],
          trash: [{ card: "BT15-068", as: "trashRookie" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

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
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("myotismon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === "BT15-076" &&
        s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-068"),
    );

    expect(s.perm("base").topCard.cardId).toBe("BT15-076");
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("loses 3 memory to Overflow when Myotismon leaves the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT15-076", as: "myotismon" }] } });
    s.state.memory = 0;
    await s.ready();
    const sourceId = s.perm("myotismon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([sourceId])).toBe(1);
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sourceId));

    expect(s.state.memory).toBe(-3);
  });
});
