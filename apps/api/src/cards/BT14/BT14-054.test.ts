import { beforeEach, describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-054.js";
import { cite } from "../../engine/conformance/_kb.js";

describe("BT14-054", () => {
  beforeEach(() => {
    cite(
      "comprehensive-0169",
      "§15-7-1/2/3: By processing conditions are optional, refusal skips the payload, and payment is whole",
      "421968eeef0e4dbcf8f51d9accb3d3014093d48e6dd988f5ff838d1442eba9ca",
    );
    cite(
      "comprehensive-0170",
      "§15-7-4/5: an impossible condition cannot be chosen; SaberLeomon's self-unsuspend condition is payable even without an opposing payload target",
      "737c0a936dea309e4f0e22b82bfd9c68e62b0bc59aff99ebbd3473c61906fc2e",
    );
  });

  it("has Piercing and suspends an opposing Digimon by unsuspending itself on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      keywords: [{ keyword: "Piercing" }],
      actions: [{ kind: "Suspend", cost: { kind: "unsuspend", target: { isSelf: true } } }],
    }));
  it("attacks an opposing Digimon at end of your turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      optional: true,
      actions: [
        { kind: "Attack", attackPlayer: false, mandatory: true, target: { filter: { controller: "opponent" } } },
      ],
    }));

  it("unsuspends itself as cost and suspends an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.isSuspended));
    expect(s.state.players[1]!.battleArea.some((p) => p.isSuspended)).toBe(true);
  });

  it.each([true, false])("publicly %s the processing condition with no opposing Digimon", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
        },
        1: { battleArea: [] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const baseId = s.perm("base").topCard.instanceId;
    const saberId = s.inst("saber").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").isSuspended).toBe(!accept);
    expect(s.perm("base").topCard).toMatchObject({ cardId: "BT14-054", instanceId: saberId });
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(saberId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not offer an unpayable self-unsuspend condition when already unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base" }],
          hand: [{ card: "BT14-054", as: "saber" }],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT14-054");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("naturally attacks the opposing Digimon from the real end-of-turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT14-042", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-054" && s.perm("target").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").isSuspended).toBe(true);
  });
});

describe("BT14-054 SaberLeomon — KB Q&A rulings", () => {
  async function runTurnWithMainPhase(s: EngineSetup, mainPhase: () => Promise<void> = async () => {}): Promise<void> {
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await mainPhase();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  }

  it("unsuspends itself with the [When Digivolving] effect even when the opponent has no Digimon (Q2422)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-049", as: "base", suspended: true }],
          hand: [{ card: "BT14-054", as: "saber" }],
        },
        1: { battleArea: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("saber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-054" && !s.perm("base").isSuspended);

    expect(s.decisions.some(({ seat, req }) => seat === 0 && req.kind === "optional")).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("BT14-054");
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("lets only one of two SaberLeomon attack when both [End of Your Turn] effects trigger together (Q2423)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-054", as: "firstSaber" },
            { card: "BT14-054", as: "secondSaber" },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: 3,
        },
        1: {
          battleArea: [
            { card: "BT14-042", as: "firstTarget", suspended: true },
            { card: "BT14-042", as: "secondTarget", suspended: true },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    await runTurnWithMainPhase(s);

    const sabers = [s.perm("firstSaber"), s.perm("secondSaber")];
    const activatedSources = s.decisions
      .filter(({ seat, req }) => seat === 0 && req.kind === "optional")
      .map(({ req }) => req.sourcePermanentId)
      .sort();
    expect(activatedSources).toEqual(sabers.map((permanent) => permanent.permanentId).sort());
    expect(s.decisions.filter(({ req }) => req.promptText.includes("attack target"))).toHaveLength(1);
    expect(sabers.filter((permanent) => permanent.isSuspended)).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.filter(({ cardId }) => cardId === "BT14-042")).toHaveLength(1);
  });

  it("cannot attack with the [End of Your Turn] effect while this Digimon is suspended (Q2424)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-054", as: "saber" }],
          deck: ["BT1-009", "BT1-009"],
          security: 3,
        },
        1: {
          battleArea: [
            { card: "BT14-042", as: "mainPhaseTarget", suspended: true },
            { card: "BT14-042", as: "endOfTurnTarget", suspended: true },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    await runTurnWithMainPhase(s, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("saber").permanentId,
          target: { kind: "permanent", permanentId: s.perm("mainPhaseTarget").permanentId },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
        s.perm("endOfTurnTarget").permanentId,
      ]);
    });

    expect(
      s.decisions.filter(({ req }) => req.kind === "optional" && req.sourcePermanentId === s.perm("saber").permanentId),
    ).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.promptText.includes("attack target"))).toHaveLength(0);
    expect(s.perm("saber").isSuspended).toBe(true);
    expect(s.perm("endOfTurnTarget").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("endOfTurnTarget").permanentId,
    ]);
  });
});
