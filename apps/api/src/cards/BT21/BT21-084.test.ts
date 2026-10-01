import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-084.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT21-084 Haru Shinkai", () => {
  it("sets memory at the start of turn, draws on linking, and fuses from hand", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "StartOfYourTurn",
        actions: [
          expect.objectContaining({
            kind: "SetMemory",
            value: 3,
            condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
          }),
        ],
      }),
    );
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
    });
    const linkedActions = (yourTurn?.actions[0] as { actions?: unknown[] } | undefined)?.actions;
    expect(linkedActions?.[0]).toMatchObject({ kind: "Draw", amount: 1, cost: { kind: "suspend" } });
    expect(linkedActions?.[1]).toMatchObject({
      kind: "AppFuse",
      from: ["hand"],
      into: { kind: ["Digimon"] },
      optional: true,
    });
    expect(yourTurn?.actions).toHaveLength(1);
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("app fuses only from the linked-trigger window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-043", as: "sociamon", linked: [{ card: "BT21-070", as: "gossipmon" }] },
          ],
          hand: ["BT21-073"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("sociamon").permanentId,
    });

    expect(s.perm("sociamon").topCard?.cardId).toBe("BT21-073");
    expect(s.perm("sociamon").stack.some((card) => card.cardId === "BT21-043")).toBe(false);
  });

  it.each([
    [2, 3],
    [3, 3],
    [4, 4],
  ])("sets memory from %i to %i at start of turn", async (before, after) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-084", as: "haru" }] } });
    await s.ready();
    s.state.memory = before;

    await advance(s.engine).fire(EffectTiming.StartOfYourTurn, s.perm("haru"));
    expect(s.state.memory).toBe(after);
  });

  it("runs the conditional Start of Your Turn memory setting through the public lifecycle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-084", as: "haru" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
          security: ["BT1-004"],
        },
        1: { deck: ["BT1-005", "BT1-006", "BT1-007"], security: ["BT1-008"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("public linking suspends Haru, draws, and app fuses the linked Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-043", as: "sociamon" },
          ],
          hand: [
            { card: "BT21-070", as: "gossipmon" },
            { card: "BT21-073", as: "charismon" },
          ],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gossipmon").instanceId,
        targetPermanentId: s.perm("sociamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sociamon").topCard.instanceId === s.inst("charismon").instanceId);

    expect(s.perm("haru").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it("declining the watcher leaves Haru unsuspended and does not draw or fuse", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-043", as: "sociamon" },
          ],
          hand: [
            { card: "BT21-073", as: "charismon" },
            { card: "BT21-070", as: "gossipmon" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gossipmon").instanceId,
        targetPermanentId: s.perm("sociamon").permanentId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("sociamon").linked.some((card) => card.instanceId === s.inst("gossipmon").instanceId));
    expect(s.perm("sociamon").linked).toHaveLength(1);
    expect(s.perm("haru").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("sociamon").topCard.cardId).toBe("BT21-043");
  });

  it("does not trigger for an opponent's linked Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-084", as: "haru" }], deck: ["BT1-009"] },
        1: {
          battleArea: [{ card: "BT21-043", as: "opponent" }],
          hand: [{ card: "BT21-070", as: "link" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("opponent").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").linked.length === 1);
    expect(s.perm("haru").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("plays itself from security through a public attack without paying cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT21-084", as: "haru" }] },
      1: { battleArea: [{ card: "BT1-019", as: "attacker" }], security: ["BT1-001"] },
    });
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await s.ready();

    const haruId = s.inst("haru").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "securityChecked") &&
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === haruId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === haruId)).toBe(true);
    const securityChecked = s.events.findIndex((event) => event.kind === "securityChecked");
    const played = s.events.findIndex((event) => event.kind === "cardPlayed" && event.cardId === "BT21-084");
    expect(securityChecked).toBeGreaterThanOrEqual(0);
    expect(played).toBeGreaterThanOrEqual(0);
    expect(played).toBeLessThan(securityChecked);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });
});

describe("BT21-084 Haru Shinkai — KB Q&A rulings", () => {
  const haruCostPrompt = "by suspending this Tamer";
  const fusedDigimonLinkPrompt = "Link";

  async function linkSociamonToGossipmon(useHaru: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "BT21-070", as: "gossipmon" },
          ],
          hand: [
            { card: "BT21-043", as: "sociamon" },
            { card: "BT21-073", as: "charismon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 5000 }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: ["BT21-084"],
        declinePrompts: useHaru ? [fusedDigimonLinkPrompt] : [fusedDigimonLinkPrompt, haruCostPrompt],
      },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("sociamon").instanceId,
        targetPermanentId: s.perm("gossipmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gossipmon").linked.length + s.perm("gossipmon").stack.length > 0);
    await drainMicrotasks();
    expect(s.state.pendingDecision).toBeUndefined();
    return s;
  }

  it("a linked card's pending [When Linking] effect cannot activate after Haru app fuses it into digivolution cards (Q4599)", async () => {
    const fused = await linkSociamonToGossipmon(true);
    expect(fused.perm("haru").isSuspended).toBe(true);
    expect(fused.perm("gossipmon").topCard.instanceId).toBe(fused.inst("charismon").instanceId);
    expect(fused.perm("gossipmon").stack.map((card) => card.instanceId)).toContain(fused.inst("sociamon").instanceId);
    expect(fused.perm("gossipmon").linked).toHaveLength(0);
    expect(fused.perm("opponent").currentDP).toBe(5000);

    const stillLinked = await linkSociamonToGossipmon(false);
    expect(stillLinked.perm("haru").isSuspended).toBe(false);
    expect(stillLinked.perm("gossipmon").linked.map((card) => card.instanceId)).toEqual([
      stillLinked.inst("sociamon").instanceId,
    ]);
    expect(stillLinked.perm("opponent").currentDP).toBe(3000);
  });

  async function attackWithDoGatchmonAndLinkTimemon(useHaru: boolean) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-084", as: "haru" },
            { card: "ST22-12", as: "doGatchmon" },
          ],
          hand: [
            { card: "BT21-059", as: "timemon" },
            { card: "BT21-023", as: "globemon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent", dp: 20000 }],
          security: ["BT1-085", "BT1-085", "BT1-085"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: useHaru ? [] : [haruCostPrompt],
      },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("doGatchmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared") && !observe(s.engine).isAttacking());
    await drainMicrotasks();
    return s;
  }

  it("<Raid> cannot activate after Haru app fuses the attacking Digimon during its [When Attacking] link (Q5444)", async () => {
    const keptRaid = await attackWithDoGatchmonAndLinkTimemon(false);
    expect(keptRaid.perm("haru").isSuspended).toBe(false);
    expect(keptRaid.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(2);
    expect(keptRaid.state.players[1]!.security).toHaveLength(3);
    expect(keptRaid.state.players[0]!.trash.map((card) => card.cardId)).toContain("ST22-12");

    const fused = await attackWithDoGatchmonAndLinkTimemon(true);
    const globemonId = fused.inst("globemon").instanceId;
    expect(fused.perm("haru").isSuspended).toBe(true);
    expect(fused.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(globemonId);
    expect(fused.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === globemonId)).toBe(
      true,
    );
    expect(fused.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
    expect(fused.state.players[1]!.security.length).toBeLessThan(3);
  });
});
