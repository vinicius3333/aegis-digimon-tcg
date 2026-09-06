import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-01 Fluffymon", () => {
  it("suspends one other Digimon with DP no greater than the attacking host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-02", dp: 3000, as: "host", under: ["ST18-01"] }] },
        1: {
          security: ["BT1-001", "BT1-002"],
          battleArea: [
            { card: "ST18-03", dp: 2000, as: "eligible" },
            { card: "ST18-03", dp: 4000, as: "tooLarge" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("eligible").isSuspended);

    expect(s.perm("eligible").isSuspended).toBe(true);
    expect(s.perm("tooLarge").isSuspended).toBe(false);
  });

  it("accepts the equal-DP boundary and selects only one target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-02", dp: 3000, as: "host", under: ["ST18-01"] }] },
        1: {
          security: ["BT1-001", "BT1-002"],
          battleArea: [
            { card: "ST18-03", dp: 3000, as: "equal" },
            { card: "ST18-03", dp: 3000, as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("equal").isSuspended);
    expect(s.perm("equal").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
  });

  it("allows declining the optional inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST18-02", dp: 3000, as: "host", under: ["ST18-01"] }] },
        1: { battleArea: [{ card: "ST18-03", dp: 2000, as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST18-01")).toBe(true);
    expect(s.perm("victim").isSuspended).toBe(false);
  });

  it("records and accepts the optional prompt, including an own-Digimon target", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          battleArea: [
            { card: "ST18-02", dp: 3000, as: "host", under: ["ST18-01"] },
            { card: "ST18-03", dp: 2000, as: "ownTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.decisions.at(-1)?.req.kind).toBe("optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ownTarget").isSuspended);
    expect(s.perm("ownTarget").isSuspended).toBe(true);
  });

  it("resets the inherited once-per-turn trigger on the next turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          battleArea: [
            { card: "ST18-02", dp: 3000, as: "host", under: ["ST18-01"] },
            { card: "ST18-03", dp: 3000, as: "firstTarget" },
            { card: "ST18-03", dp: 3000, as: "secondTarget" },
          ],
        },
        1: {
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").isSuspended);
    expect(s.perm("secondTarget").isSuspended).toBe(false);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    preferInstanceIds.push(s.perm("secondTarget").permanentId, s.perm("secondTarget").topCard!.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondTarget").isSuspended);
    expect(s.perm("secondTarget").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
