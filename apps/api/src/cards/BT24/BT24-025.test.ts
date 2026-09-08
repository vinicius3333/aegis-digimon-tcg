import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-025.js";
import "../index.js";

describe("BT24-025 Shellmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-025")).toMatchObject({
      cardId: "BT24-025",
      nameEn: "Shellmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mollusk", "Iliad", "TS", "Aquatic"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
    });
  });

  it("digivolves on another blue TS Digimon's unsuspend, ignoring only level", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { excludeSelf: true, colors: ["Blue"] },
          actions: [{ kind: "Digivolve", from: ["hand"], payCost: true, ignoreLevelRequirement: true, optional: true }],
        },
      ],
    });
  });

  it("keeps the once-per-turn end-of-turn unsuspend and inherited Jamming", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", optional: true }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });

  it.each([
    ["printed blue requirement", 0, 4],
    ["TS alternate requirement", 1, 3],
  ])("publicly chooses the %s while ignoring level for cost %i (Q5604)", async (_label, option, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "trigger", suspended: true },
          ],
          hand: [{ card: "BT24-040", as: "venusmon" }],
          deck: [
            { card: "BT1-009", as: "bonusDraw" },
            { card: "BT1-009", as: "spare" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: option,
      },
    );
    s.state.memory = 10;
    await s.ready();
    s.state.isFirstPlayersFirstTurn = false;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("shellmon").topCard.instanceId === s.inst("venusmon").instanceId);

    expect(s.state.memory).toBe(10 - cost);
    expect(s.perm("shellmon").topCard.instanceId).toBe(s.inst("venusmon").instanceId);
    expect(s.perm("shellmon").stack.map((card) => card.instanceId)).toEqual([s.inst("shellmon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not ignore color or trait requirements for an incompatible Venusmon (Q5603)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "trigger", suspended: true },
          ],
          hand: [{ card: "BT10-042", as: "venusmon" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-025");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("venusmon").instanceId);
    expect(s.state.memory).toBe(10);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("only reacts to another blue TS Digimon's unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-011", as: "redTs" },
            { card: "BT24-020", as: "blueTs" },
          ],
          hand: [{ card: "BT24-040", as: "venusmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("redTs").permanentId,
    });
    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-025");
    await advance(s.engine).fireSubTrigger("whenUnsuspended", {
      unsuspendedPermanentId: s.perm("blueTs").permanentId,
    });
    await settle(() => s.perm("shellmon").topCard.cardId === "BT24-040");

    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-040");
  });

  it("naturally reacts when another blue TS Digimon unsuspends during the public unsuspend phase (Q5605)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "trigger", suspended: true },
          ],
          hand: [{ card: "BT24-040", as: "venusmon" }],
        },
        1: { battleArea: [{ card: "BT1-040", as: "opponentHost", under: ["BT24-022"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();

    const opponentSourceId = s.perm("opponentHost").stack[0]!.instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.perm("shellmon").topCard.cardId === "BT24-040");

    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-040");
    expect(s.perm("shellmon").stack.map((card) => card.cardId)).toEqual(["BT24-025"]);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(opponentSourceId);
    const drawPhaseIndex = s.events.findIndex((event) => event.kind === "phaseChanged" && event.phase === "Draw");
    const sourceTrashIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.to === "trash" && event.instanceIds.includes(opponentSourceId),
    );
    expect(sourceTrashIndex).toBeGreaterThanOrEqual(0);
    expect(sourceTrashIndex).toBeLessThan(drawPhaseIndex);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not react to self, red TS, or non-TS unsuspends in a public turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon", suspended: true },
            { card: "BT24-011", as: "redTs", suspended: true },
            { card: "BT1-009", as: "nonTs", suspended: true },
          ],
          hand: [{ card: "BT24-040", as: "venusmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !s.perm("shellmon").isSuspended && !s.perm("redTs").isSuspended);
    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-025");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("venusmon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("publicly refuses Venusmon evolution after a qualifying unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "trigger", suspended: true },
          ],
          hand: [{ card: "BT24-040", as: "venusmon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !s.perm("trigger").isSuspended);
    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-025");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("venusmon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("may unsuspend one other TS Digimon at end of turn and grants inherited Jamming", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "tsTarget", suspended: true },
            { card: "BT1-040", as: "nonTs", suspended: true, under: ["BT24-025"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("nonTs"), "Jamming")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("shellmon"));

    expect(s.perm("tsTarget").isSuspended).toBe(false);
    expect(s.perm("nonTs").isSuspended).toBe(true);
  });

  it("keeps an inherited Jamming host after a public security battle against higher DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-040", as: "attacker", under: ["BT24-025"] }] },
      1: { security: [{ card: "BT24-051", as: "securityDigimon" }], deck: ["BT1-009", "BT1-009"] },
    });
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(attackerId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("securityDigimon").instanceId);
  });

  it("publicly unsuspends one other TS Digimon at the end of the owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "target", dp: 20_000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: targetId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("target").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("target").permanentId).toBe(targetId);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("publicly declines the optional end-of-turn TS unsuspend", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-025", as: "shellmon" },
            { card: "BT24-020", as: "target", dp: 20_000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: targetId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("target").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("target").permanentId).toBe(targetId);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("reaches Shellmon through a legal blue level-3 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-021", as: "base" }],
        hand: [{ card: "BT24-025", as: "shellmon" }],
        deck: [{ card: "BT1-009", as: "bonusDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shellmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("shellmon").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("shellmon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
  });

  it("rejects a normal evolution into Venusmon and preserves the zones and memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-025", as: "shellmon" }],
        hand: [{ card: "BT24-040", as: "venusmon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const shellId = s.perm("shellmon").permanentId;
    const venusId = s.inst("venusmon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: shellId,
        instanceId: venusId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(10);
    expect(s.perm("shellmon").permanentId).toBe(shellId);
    expect(s.perm("shellmon").topCard.cardId).toBe("BT24-025");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(venusId);
  });
});
