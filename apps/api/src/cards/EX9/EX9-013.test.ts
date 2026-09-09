import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX9-013.js";
import "../index.js";

describe("EX9-013", () => {
  it("has Blast Digivolve, Alliance, and Blocker", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({
      keyword: "BlastDigivolve",
    });
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Alliance", raw: "＜Alliance＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ]),
    );
  });
  it("de-digivolves by 3 on play and digivolving and can DNA digivolve at end of turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 3,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions).toMatchObject([
      { kind: "DnaDigivolve", payCost: true, optional: true },
      { kind: "Attack", optional: true },
    ]);
  });

  it("DNA digivolves into Omnimon Alter-S and then permits the follow-up attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-013", as: "blitz" },
            { card: "EX9-020", as: "cres" },
          ],
          hand: [{ card: "EX9-021", as: "alterS" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    await s.ready();
    await advance(s.engine).runTurn(0);
    await settle();
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);

    // Alter-S's End of Attack effect truthfully moves its two DNA materials
    // back to the battle area and itself to the top of its owner's security.
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining(["EX9-013", "EX9-020"]),
    );
    expect(s.state.players[0]!.security[0]!.cardId).toBe("EX9-021");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX9-021")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("can refuse DNA evolution and still accept the optional follow-up attack (Q4756)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-013", as: "blitz" },
            { card: "EX9-020", as: "cres" },
          ],
          hand: ["EX9-021"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const dnaChoice = s.state.pendingDecision!;
    expect(dnaChoice.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dnaChoice.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== dnaChoice.decisionId,
    );
    const attackChoice = s.state.pendingDecision!;
    expect(attackChoice.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackChoice.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("cres").permanentId })).toEqual({
      ok: true,
    });
    await turn;
    await settle();
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX9-013", "EX9-020"]);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("EX9-021");
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Blast Digivolves from hand during an opponent attack without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-064", as: "attacker" }] },
        1: { battleArea: [{ card: "EX9-011", as: "host" }], hand: [{ card: "EX9-013", as: "ace" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
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
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window missing");
    const counter = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("ace").instanceId);
    expect(counter).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: counter!.instanceId,
        effectKey: counter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX9-013");
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toEqual([]);
    expect(s.state.memory).toBe(0);
  });

  it("uses Alliance in a real attack and restores the attacker after battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX9-013", dp: 12000, as: "attacker" },
          { card: "BT1-009", dp: 4000, as: "ally" },
        ],
        security: ["BT1-009", "BT1-009"],
      },
      1: { security: ["BT1-009", "BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(12000);
  });

  it("passes inherited Security Attack +1 from a legal evolved host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-013", as: "base" }], hand: [{ card: "BT5-086", as: "evo" }] },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-086");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("EX9-013");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not grant Security Attack +1 to a direct BT5-086", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-086", as: "base" }] },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("uses Blocker to intercept an opponent attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 5000, as: "attacker" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "EX9-013", dp: 12000, as: "blocker" }], security: ["BT1-009"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it.each([
    [["EX9-013", "EX9-007", "EX9-009", "EX9-011"], "EX9-007"],
    [["EX9-013", "EX9-009", "EX9-011"], "EX9-009"],
  ] as const)(
    "de-digivolves exactly three cards on a real play and stops at the remaining top",
    async (stack, expectedTop) => {
      const s = setupEngine(
        {
          0: { hand: [{ card: "EX9-013", as: "source" }] },
          1: { battleArea: [{ card: stack[0], as: "target", under: stack.slice(1) }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.perm("target").topCard.cardId === expectedTop);
      expect(s.perm("target").topCard.cardId).toBe(expectedTop);
      expect(s.perm("target").stack).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("de-digivolves exactly three cards on a real evolution and stops at the remaining top", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-011", as: "base" }], hand: [{ card: "EX9-013", as: "source" }] },
        1: { battleArea: [{ card: "EX9-013", as: "target", under: ["EX9-007", "EX9-009", "EX9-011"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-013");
    expect(s.perm("base").topCard.cardId).toBe("EX9-013");
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("EX9-007");
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
