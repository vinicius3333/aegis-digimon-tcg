import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-005.js";

describe("LM-005 Amphimon", () => {
  it("blast-digivolves from hand in the counter window without paying the cost", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-005", as: "amphimon" }], battleArea: [{ card: "BT1-038", as: "base" }] },
        1: { battleArea: [{ card: "BT1-080", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 2;
    await s.ready();
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    await settle();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("amphimon").instanceId,
        permanentId: s.perm("base").permanentId,
        useBlastDigivolve: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "LM-005");

    expect(s.perm("base").topCard?.cardId).toBe("LM-005");
    expect(s.state.memory).toBe(2);
  });

  it("trashes one card under each of two opposing permanents for two blue cards, per Q3994", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-005", as: "amphimon" }],
          hand: [
            { card: "BT1-029", as: "blueA" },
            { card: "BT1-029", as: "blueB" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "left", under: ["BT1-027"] },
            { card: "BT2-064", as: "right", under: ["BT1-045"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("amphimon"));
    await settle(() => s.state.players[1]!.trash.length === 2, 2000);

    // One stack card came off each opposing permanent, not the permanents themselves.
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-029")).toHaveLength(2);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-027", "BT1-045"]);
  });

  it("returns an opposing permanent with no cards under it to the hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-005", as: "amphimon" }], hand: [{ card: "BT1-029", as: "blue" }] },
        1: { battleArea: [{ card: "BT1-080", as: "bare" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("amphimon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-080")).toBe(true);
  });

  it("leaves a stacked opposing permanent in play when nothing was trashed from under it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-005", as: "amphimon" }] },
        1: { battleArea: [{ card: "BT1-080", as: "stacked", under: ["BT1-027"] }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("amphimon"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("stacked").stack).toHaveLength(1);
  });

  it("returns three Jellymon-text cards from trash for Security Attack +1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-005", as: "amphimon" }],
          trash: ["LM-002", "LM-003", "LM-004"],
          deck: ["BT1-027"],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("amphimon"));
    await settle(() => s.state.players[0]!.trash.length === 0, 2000);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(observe(s.engine).keywordAmount(s.perm("amphimon"), "SecurityAttack")).toBe(1);
  });

  it("stacks a second Security Attack +1 when it attacks again in the same turn, per Q3995", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-005", as: "amphimon" }],
          trash: ["LM-002", "LM-003", "LM-004", "LM-002", "LM-003", "LM-004"],
          deck: ["BT1-027"],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("amphimon"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("amphimon"));
    await settle(() => s.state.players[0]!.trash.length === 0, 2000);

    expect(observe(s.engine).keywordAmount(s.perm("amphimon"), "SecurityAttack")).toBe(2);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-005");
    const compiled = runtimeCompiledCard("LM-005");
    expect(definition?.nameEn).toBe("Amphimon");
    expect(definition?.dp).toBe(11000);
    expect(definition?.isAce).toBe(true);
    expect(definition?.overflowMemory).toBe(4);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
