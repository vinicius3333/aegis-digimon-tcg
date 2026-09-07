import { EffectTiming, getCardDefinition, type DecisionRequest } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { irNode, type IrNode } from "../../engine/testkit/irNode.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-079.js";

/**
 * Eri's App Fuse tail chains several prompts (the fuse offer, the material choice, and the
 * result card's own When Digivolving offer). The production DecisionManager exposes one at a
 * time, so the public path is driven by answering whatever is pending until the board settles.
 * `declineSourceCardIds` refuses the optional prompts a fixture wants left unused.
 */
async function answerPrompts(
  s: EngineSetup,
  options: {
    seat?: 0 | 1;
    declineSourceCardIds?: string[];
    preferInstanceIds?: string[];
    until: () => boolean;
    steps?: number;
  },
): Promise<void> {
  const seat = options.seat ?? 0;
  const decline = new Set(options.declineSourceCardIds ?? []);
  const prefer = options.preferInstanceIds ?? [];
  for (let step = 0; step < (options.steps ?? 16) && !options.until(); step += 1) {
    const pending: DecisionRequest | undefined = s.decisions.find(
      ({ req }) => req.decisionId === s.state.pendingDecision?.decisionId,
    )?.req;
    if (pending === undefined) {
      await settle(() => s.state.pendingDecision !== undefined || options.until());
      continue;
    }
    const response = (() => {
      if (pending.kind === "optional")
        return { kind: "optional" as const, accept: !decline.has(pending.sourceCardId ?? "") };
      if (pending.kind === "selectCards") {
        const ids = pending.options?.candidateInstanceIds;
        if (ids === undefined) throw new Error("selectCards decision omitted candidates");
        const wanted = ids.find((id) => prefer.includes(id));
        return { kind: "selectCards" as const, instanceIds: wanted === undefined ? ids.slice(0, 1) : [wanted] };
      }
      const keys = pending.options?.triggerKeys;
      if (keys === undefined) throw new Error("orderTriggers decision omitted keys");
      return { kind: "orderTriggers" as const, order: keys.slice(0, 1) };
    })();
    expect(s.engine.applyIntent(seat, { type: "respondDecision", decisionId: pending.decisionId, response })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.pendingDecision === undefined || s.state.pendingDecision.decisionId !== pending.decisionId,
    );
  }
}

describe("BT23-079 Eri Karan", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-079")).toMatchObject({
      cardId: "BT23-079",
      nameEn: "Eri Karan",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      types: ["App Driver", "Appmon"],
      effectText:
        "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.  [Your Turn] When any of your Digimon get linked, by suspending this Tamer, those Digimon get +3000 DP until your opponent's turn ends. Then, 1 of your Digimon may app fuse into a Digimon card in the hand.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.map((entry) => entry.trigger)).toEqual(["StartOfYourMainPhase", "YourTurn", "Security"]);
  });

  it("targets the linked Digimon itself and keeps the App Fuse tail behind the suspend cost", () => {
    const watcher = irNode(compiled.effects.find((entry) => entry.trigger === "YourTurn")).actions[0];
    expect(watcher.event).toBe("whenLinked");
    expect(watcher.sourceFilter).toMatchObject({ controller: "mine", kind: ["Digimon"] });
    expect(watcher.actions.map((action: IrNode) => action.kind)).toEqual(["ModifyDP", "AppFuse"]);
    expect(watcher.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      optional: true,
      abortOnDecline: true,
      target: { sourceRef: "triggerSubject", count: 1 },
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
    });
    expect(watcher.actions[1]).toMatchObject({
      kind: "AppFuse",
      from: ["hand"],
      source: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      into: { controllerDefault: "mine", kind: ["Digimon"] },
      optional: true,
    });
  });

  // Clause 1: [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
  it("gains exactly 1 memory at the start of its own Main phase when the opponent has a Digimon", async () => {
    // Both fixtures keep a spare playable card so the production Main phase stays open.
    const withOpponent = setupEngine({
      0: { battleArea: [{ card: "BT23-079", as: "eri" }], hand: ["BT1-009"], deck: Array(10).fill("BT1-009") },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: Array(10).fill("BT1-010") },
    });
    const loop = withOpponent.engine.startTurnLoop();
    await advance(withOpponent.engine).waitForMainPhase(0);
    const gained = withOpponent.state.memory;
    expect(withOpponent.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;

    const withoutOpponent = setupEngine({
      0: { battleArea: [{ card: "BT23-079", as: "eri" }], hand: ["BT1-009"], deck: Array(10).fill("BT1-009") },
      1: { deck: Array(10).fill("BT1-010") },
    });
    const bareLoop = withoutOpponent.engine.startTurnLoop();
    await advance(withoutOpponent.engine).waitForMainPhase(0);
    const baseline = withoutOpponent.state.memory;
    expect(withoutOpponent.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await bareLoop;

    expect(gained).toBe(baseline + 1);
    expect(withOpponent.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("does not gain memory on the opponent's Main phase even with an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-079", as: "eri" }], deck: Array(10).fill("BT1-009") },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: Array(10).fill("BT1-010") },
    });
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    const opponentMainMemory = s.state.memory;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.memory).toBe(opponentMainMemory);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Clause 2: [Your Turn] When any of your Digimon get linked, by suspending this Tamer, those
  // Digimon get +3000 DP until your opponent's turn ends.
  it("suspends Eri and boosts the naturally linked host by exactly 3000 through the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT23-007", as: "host" },
            { card: "BT1-009", as: "bystander" },
          ],
          hand: [{ card: "BT23-039", as: "link" }],
          deck: Array(10).fill("BT1-010"),
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: Array(10).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const bystanderBefore = s.perm("bystander").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    await settle(() => s.perm("eri").isSuspended);

    // Musclemon 1000 + Perorimon's link DP 2000 + Eri's 3000.
    const boosted = s.perm("host").currentDP;
    expect(s.perm("eri").isSuspended).toBe(true);
    expect(boosted).toBe(6000);
    expect(s.perm("bystander").currentDP).toBe(bystanderBefore);
    expect(s.state.memory).toBe(4);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

    // Still boosted throughout the opponent's turn.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(6000);

    // Expired once the opponent's turn ended.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for the opponent's own link on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-079", as: "eri" }], deck: Array(10).fill("BT1-009") },
        1: {
          battleArea: [{ card: "BT23-007", as: "opponentHost" }],
          hand: [{ card: "BT23-039", as: "opponentLink" }],
          deck: Array(10).fill("BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = -5;
    const hostBefore = s.perm("opponentHost").currentDP;

    expect(
      s.engine.applyIntent(1, {
        type: "linkCard",
        instanceId: s.inst("opponentLink").instanceId,
        targetPermanentId: s.perm("opponentHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentHost").linked.length === 1);

    expect(s.perm("eri").isSuspended).toBe(false);
    expect(s.perm("opponentHost").currentDP).toBe(hostBefore + 2000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a link whose subject is an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-079", as: "eri" }] },
        1: { battleArea: [{ card: "BT23-007", as: "opponentHost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.perm("opponentHost").currentDP;
    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("opponentHost").permanentId,
    });
    expect(s.perm("eri").isSuspended).toBe(false);
    expect(s.perm("opponentHost").currentDP).toBe(before);
  });

  it("cannot pay the suspend cost when Eri is already suspended, so nothing happens", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri", suspended: true },
            { card: "BT23-007", as: "host" },
          ],
          hand: [
            { card: "BT23-039", as: "link" },
            { card: "BT23-021", as: "dosukomon" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: Array(10).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const dosukomonId = s.inst("dosukomon").instanceId;
    const hostTopId = s.perm("host").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    await settle(() => s.state.pendingDecision === undefined, 200);

    // The link itself succeeded (1000 + 2000 link DP); Eri's 3000 was never added.
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.perm("eri").isSuspended).toBe(true);
    expect(s.perm("host").topCard?.instanceId).toBe(hostTopId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(dosukomonId);
    expect(s.events.some((event) => event.kind === "digivolved")).toBe(false);
  });

  // Q5354: refusing the suspend also refuses the "Then, ... app fuse" tail.
  it("Q5354: declining the suspend cost aborts both the DP boost and the App Fuse", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT23-007", as: "host" },
          ],
          hand: [
            { card: "BT23-039", as: "link" },
            { card: "BT23-021", as: "dosukomon" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: Array(10).fill("BT1-011") },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const dosukomonId = s.inst("dosukomon").instanceId;
    const hostTopId = s.perm("host").topCard!.instanceId;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    await settle(() => s.state.pendingDecision === undefined, 200);

    expect(s.perm("eri").isSuspended).toBe(false);
    // Only the link's own 2000 DP, never Eri's 3000.
    expect(s.perm("host").currentDP).toBe(3000);
    expect(s.perm("host").topCard?.instanceId).toBe(hostTopId);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(dosukomonId);
    // No App Fusion happened, so no procedure draw either.
    expect(s.state.players[0]!.hand).toHaveLength(handBefore - 1);
    expect(s.events.some((event) => event.kind === "digivolved")).toBe(false);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  // Clause 2 tail: Then, 1 of your Digimon may app fuse into a Digimon card in the hand.
  it("accepting the suspend then app fuses the boosted host into the hand Digimon and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-079", as: "eri" },
          { card: "BT23-007", as: "host" },
        ],
        hand: [
          { card: "BT23-039", as: "link" },
          { card: "BT23-021", as: "dosukomon" },
        ],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: Array(10).fill("BT1-014") },
    });
    await s.ready();
    s.state.memory = 5;
    const oldTopId = s.perm("host").topCard!.instanceId;
    const linkId = s.inst("link").instanceId;
    const dosukomonId = s.inst("dosukomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linkId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    // Decline only Dosukomon's own When Digivolving Link offer; accept Eri's suspend and fuse.
    await answerPrompts(s, {
      declineSourceCardIds: ["BT23-021"],
      until: () => s.perm("host").topCard?.cardId === "BT23-021",
    });
    await settle(() => s.perm("host").topCard?.cardId === "BT23-021", 1000);
    await settle(() => s.state.pendingDecision === undefined, 200);

    expect(s.perm("eri").isSuspended).toBe(true);
    expect(s.perm("host").topCard?.instanceId).toBe(dosukomonId);
    expect(s.perm("host").enteredByEffect).toBe(true);
    // The old top and the consumed link become digivolution cards, bottom-most first.
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([oldTopId, linkId]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "digivolved", mechanic: "appFusion", cardId: "BT23-021" }),
    );
    // The link declaration costs 1; the printed App Fusion cost is 0.
    expect(s.state.memory).toBe(4);
    // One evolution draw: BT1-010 off the top of the deck.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  // Clause 3: [Security] Play this card without paying the cost.
  it("plays itself from Security without paying its cost of 3", async () => {
    async function runSecurityCheck(securityCardId: string): Promise<{ setup: EngineSetup; revealedId: string }> {
      const s = setupEngine(
        {
          0: { security: [{ card: securityCardId, as: "revealed" }], deck: Array(10).fill("BT1-009") },
          1: { battleArea: [{ card: "BT1-009", as: "attacker" }], hand: ["BT1-009"], deck: Array(10).fill("BT1-010") },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      const revealedId = s.inst("revealed").instanceId;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.security.length === 0);
      await settle(() => s.state.pendingDecision === undefined, 200);
      expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      return { setup: s, revealedId };
    }

    const eri = await runSecurityCheck("BT23-079");
    // BT1-009 has no Security effect, so its memory line is the free-of-charge baseline.
    const control = await runSecurityCheck("BT1-009");

    expect(
      eri.setup.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === eri.revealedId),
    ).toBe(true);
    expect(eri.setup.state.players[0]!.security).toHaveLength(0);
    expect(eri.setup.state.players[0]!.trash.some((card) => card.instanceId === eri.revealedId)).toBe(false);
    // Playing the cost-3 Tamer from Security charged nothing: the memory line matches the
    // control run where the revealed card had no Security effect at all.
    expect(eri.setup.state.memory).toBe(control.setup.state.memory);
    expect(eri.setup.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });
});
