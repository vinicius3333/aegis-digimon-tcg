import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-070.js";

describe("EX1-070 Fight for Your Pride!", () => {
  it("plays a purple level-4-or-lower Digimon from trash and gives one Blocker when Myotismon is present", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-070", as: "option" }],
          battleArea: [
            { card: "EX1-063", as: "myotismon" },
            { card: "EX1-056", as: "purpleSource" },
          ],
          trash: [{ card: "EX1-057", as: "played" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-057"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => observe(s.engine).hasKeyword(p, "Blocker")));
    expect(s.state.players[0]!.battleArea.some((p) => observe(s.engine).hasKeyword(p, "Blocker"))).toBe(true);
  });

  it("plays a purple level-4-or-lower Digimon from its owner's trash in security", async () => {
    const s = setupEngine(
      {
        1: {
          security: [{ card: "EX1-070", as: "option", faceUp: true }],
          trash: [
            { card: "EX1-057", as: "eligible" },
            { card: "EX1-061", as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("plays a purple level-4-or-lower Digimon during a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          security: [{ card: "EX1-070", as: "option" }],
          trash: [
            { card: "EX1-057", as: "eligible" },
            { card: "EX1-061", as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === eligibleId));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
  });

  it("does not grant Blocker when the required Myotismon is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-070", as: "option" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          trash: [{ card: "EX1-057", as: "played" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-057"));
    expect(s.state.players[0]!.battleArea.some((p) => observe(s.engine).hasKeyword(p, "Blocker"))).toBe(false);
  });

  it("expires the Blocker grant after the opponent's next turn", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-070", as: "option" }],
          battleArea: [
            { card: "EX1-063", as: "myotismon" },
            { card: "EX1-056", as: "purpleSource" },
          ],
          trash: [{ card: "EX1-057", as: "played" }],
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
        1: {
          deck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
          security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 4;
    preferInstanceIds.push(s.inst("played").instanceId);
    await s.ready();
    const loop = s.engine.startTurnLoop();
    const played = () => s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX1-057");
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const permanent = played();
      return permanent !== undefined && observe(s.engine).hasKeyword(permanent, "Blocker");
    });
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(played()!, "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 0 && s.state.phase === "Main", 5000);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(played()!, "Blocker")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
