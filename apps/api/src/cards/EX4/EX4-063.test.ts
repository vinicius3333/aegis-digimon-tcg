import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-063.js";

describe("EX4-063 Henry Wong & Shu-Chong Wong", () => {
  it("plays Terriermon or Lopmon with the one-or-fewer Digimon gate and restricts it", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Digimon"] } },
      target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Terriermon", "Lopmon"] }] } },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "Restrict",
      target: { filter: { boundRef: "playedByStartEffect" } },
      restriction: "digivolve",
    });
    expect(actions?.[2]).toMatchObject({ kind: "DelayedDelete", timing: "endOfOpponentTurn" });
  });
  it("uses digivolution-card name matching for the erratared cost reduction", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      sourceFilter: { digivolutionStackNameOrTrait: [{ match: "nameExact", tokens: ["Terriermon", "Lopmon"] }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-063");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("does not play a longer Terriermon name as an exact target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-063", as: "subject" }],
          hand: [{ card: "BT16-038", as: "longTerriermonName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("subject"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("longTerriermonName").instanceId);
  });

  it("plays and binds Terriermon at the real Start of Main, then deletes that instance at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-063", as: "subject" }],
          hand: [{ card: "ST17-02", as: "terrier" }],
          deck: Array.from({ length: 8 }, () => "BT1-011"),
          security: ["BT1-009", "BT1-010", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          deck: Array.from({ length: 8 }, () => "BT1-011"),
          security: ["BT1-009", "BT1-010", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("terrier").instanceId)!;
    const playedPermanentId = played.permanentId;
    expect(played).toBeDefined();
    expect(observe(s.engine).isRestricted(played, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(s.inst("terrier").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === playedPermanentId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === playedPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("terrier").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("subject").permanentId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("opponent").permanentId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays Terriermon at the real Start of Main Phase with exactly one Digimon already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-063", as: "subject" },
            { card: "BT1-010", as: "existing" },
          ],
          hand: [{ card: "ST17-02", as: "terrier" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-011", "BT1-012"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("terrier").instanceId,
    );
    expect(played).toBeDefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(observe(s.engine).isRestricted(played!, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("terrier").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not play Terriermon at the real Start of Main Phase with two Digimon already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-063", as: "subject" },
            { card: "BT1-010", as: "existing" },
            { card: "BT1-010", as: "existing2" },
          ],
          hand: [{ card: "ST17-02", as: "terrier" }],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-011", "BT1-012"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("terrier").instanceId,
      ),
    ).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("terrier").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not play from hand when the one-Digimon gate is exceeded", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-063", as: "subject" },
            { card: "BT1-010", as: "existing" },
            { card: "BT1-010", as: "existing2" },
          ],
          hand: [{ card: "ST17-02", as: "terrier" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("subject"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("terrier").instanceId);
  });

  it("reduces a legal evolution with Terriermon in sources and suspends this Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-063", as: "subject" },
            { card: "BT1-064", as: "carrier", under: ["ST17-02"] },
          ],
          hand: [{ card: "BT17-046", as: "gargomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("carrier").permanentId,
        instanceId: s.inst("gargomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("carrier").topCard?.cardId === "BT17-046");
    expect(s.state.memory).toBe(0);
    expect(s.perm("subject").isSuspended).toBe(true);
  });
  ex4CardBehaviorTests("EX4-063");
});
