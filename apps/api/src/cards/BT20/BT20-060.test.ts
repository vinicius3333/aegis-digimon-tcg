import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-060.js";
import "./index.js";

describe("BT20-060 Alphamon: Ouryuken", () => {
  it("provides Blast DNA Digivolve from hand", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
  });

  it("reduces one opposing Digimon by 15000 and, only on DNA digivolving, trashes the top security card and recovers one", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({ kind: "ModifyDP", amount: -15000, duration: "untilOpponentTurnEnd" });
      expect(actions[1]).toMatchObject({
        kind: "Trash",
        condition: { kind: "isDnaDigivolving" },
        target: { filter: { controller: "opponent", zone: "security", position: "top" }, count: 1 },
      });
      expect(actions[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Recovery", amount: 1 },
        condition: { kind: "isDnaDigivolving" },
      });
    }
  });

  it("gains 3 memory once per turn when security is removed", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
          actions: [{ kind: "GainMemory", amount: 3 }],
        },
      ],
    });
  });

  it("publishes the ACE/Overflow and printed stat metadata", () => {
    expect(getCardDefinition("BT20-060")).toMatchObject({
      isAce: true,
      overflowMemory: 5,
      playCost: 9,
      dp: 16000,
      level: 7,
    });
  });

  it("on normal play and evolution applies -15000 without trashing or recovering security", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "play" ? {} : { battleArea: [{ card: "BT20-056", as: "base" }] }),
            hand: [{ card: "BT20-060", as: "ouryuken" }],
            deck: [
              { card: "BT20-047", as: "drawCard" },
              { card: "BT20-047", as: "deckTop" },
            ],
            security: ["BT20-047"],
          },
          1: {
            battleArea: [{ card: "BT20-057", dp: 20000, as: "target" }],
            security: ["BT20-047", "BT20-047"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = mode === "play" ? 9 : 6;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ouryuken").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("ouryuken").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.perm("target").currentDP === 5000);
      expect(s.state.players[0]!.security).toHaveLength(1);
      expect(s.state.players[0]!.deck).toHaveLength(mode === "play" ? 2 : 1);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.state.memory).toBe(0);
    }
  });

  it("Q4398 Blast DNA finishes security trash and Recovery before deleting a 0-DP target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-056", as: "alphamon" }],
          hand: [
            { card: "BT20-018", as: "ouryumon" },
            { card: "BT20-060", as: "ouryuken" },
          ],
          deck: [
            { card: "BT20-047", as: "drawn" },
            { card: "BT20-047", as: "recovered" },
          ],
          security: [{ card: "BT20-047", as: "ownSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT20-057", dp: 15000, as: "target" }],
          security: [{ card: "BT20-047", as: "trashed" }, "BT20-047"],
          deck: ["BT20-001", "BT20-002"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("ouryuken").instanceId);
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice!.instanceId,
        effectKey: choice!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "counterResolved") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-060") &&
        s.state.pendingDecision === undefined,
    );
    const recoveryIndex = s.events.findIndex((event) => event.kind === "securityRecovered" && event.seat === 0);
    const targetTrashIndex = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes(s.inst("target").instanceId),
    );
    expect(recoveryIndex).toBeGreaterThanOrEqual(0);
    expect(targetTrashIndex).toBeGreaterThan(recoveryIndex);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashed").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ouryuken").instanceId)).toBe(false);
    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-060")!.stack.map(
        (card) => card.cardId,
      ),
    ).toEqual(["BT20-018", "BT20-056"]);
  });

  it("does not offer Blast DNA when the Ouryumon material is missing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-056", as: "alphamon" }],
          hand: [{ card: "BT20-060", as: "ouryuken" }],
          security: ["BT20-047"],
        },
        1: {
          battleArea: [{ card: "BT20-009", as: "attacker" }],
          security: ["BT20-047"],
          deck: ["BT20-001", "BT20-002"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "counterWindowOpened")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ouryuken").instanceId)).toBe(true);
  });

  it("gains 3 memory only once across removals from both security stacks", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-060", as: "ouryuken" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.state.memory).toBe(3);
  });

  it("charges Overflow -5 when the ACE leaves the field", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-060", as: "ouryuken" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("ouryuken").permanentId], "byEffect");
    expect(s.state.memory).toBe(-5);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT20-060");
  });
});
