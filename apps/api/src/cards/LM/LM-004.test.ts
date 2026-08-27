import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-004.js";

const entranceBoard = {
  0: {
    battleArea: [
      { card: "LM-004", as: "thetismon" },
      { card: "BT1-027", as: "digimon", suspended: true },
      { card: "BT9-086", as: "kiyoshiro", suspended: true },
    ],
    hand: ["BT1-027", "BT1-027"],
  },
};

describe("LM-004 Thetismon", () => {
  it("trashes exactly two blue cards to unsuspend a Digimon and Kiyoshiro and gain Blocker", async () => {
    const s = setupEngine(entranceBoard, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("thetismon"));
    await settle(() => !s.perm("digimon").isSuspended && !s.perm("kiyoshiro").isSuspended);

    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-027")).toHaveLength(2);
    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(s.perm("kiyoshiro").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(true);
  });

  it("does the same on the When Digivolving timing", async () => {
    const s = setupEngine(entranceBoard, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("thetismon"));
    await settle(() => !s.perm("digimon").isSuspended);

    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(true);
  });

  it("leaves the board untouched when the trash cost is declined", async () => {
    const s = setupEngine(entranceBoard, { autoDeclineOptional: true, autoSelectCards: true });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("thetismon"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("kiyoshiro").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(false);
  });

  it("cannot resolve the entrance effect with fewer than two blue cards to trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-004", as: "thetismon" },
            { card: "BT1-027", as: "digimon", suspended: true },
            { card: "BT9-086", as: "kiyoshiro", suspended: true },
          ],
          hand: ["BT1-027", "BT1-020"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("thetismon"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("digimon").isSuspended).toBe(true);
    expect(s.perm("kiyoshiro").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("thetismon"), "Blocker")).toBe(false);
  });

  it("unsuspends the host once per turn when a Jellymon-text card is trashed from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-005", as: "host", under: ["LM-004"], suspended: true }],
          hand: [
            { card: "LM-002", as: "jellymon" },
            { card: "LM-003", as: "teslaJellymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "LM-002",
      trashedFromHandInstanceId: s.inst("jellymon").instanceId,
      handTrashedSeat: 0,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);

    s.perm("host").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "LM-003",
      trashedFromHandInstanceId: s.inst("teslaJellymon").instanceId,
      handTrashedSeat: 0,
    });
    await settle(() => s.state.pendingDecision === null);
    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("ignores a hand-trashed card with no Jellymon in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-005", as: "host", under: ["LM-004"], suspended: true }],
          hand: [{ card: "BT1-027", as: "unrelated" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenTrashedFromHand", {
      trashedFromHandCardId: "BT1-027",
      trashedFromHandInstanceId: s.inst("unrelated").instanceId,
      handTrashedSeat: 0,
    });
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-004");
    const compiled = runtimeCompiledCard("LM-004");
    expect(definition?.nameEn).toBe("Thetismon");
    expect(definition?.dp).toBe(7000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
  });
});
