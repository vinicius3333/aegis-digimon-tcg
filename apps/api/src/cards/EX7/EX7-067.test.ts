import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-067.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop turn loop");
  await loop;
}

describe("EX7-067 Summon Frost", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-067")).toMatchObject({
      cardId: "EX7-067",
      nameEn: "Summon Frost",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 5,
      types: ["Option"],
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-067")).toBe(true);
  });
  it("trashes 2 digivolution cards from each opposing Digimon, then may play a level 4 or lower Ice-Snow Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", target: { count: "all" }, amount: 2 });
    expect(actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      condition: { kind: "ifThisEffectDidNotAct" },
    });
  });
  it("restricts attack for opposing Digimon with no digivolution cards and activates from security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[2]).toMatchObject({
      kind: "Restrict",
      restriction: "attack",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "ActivateMain" });
  });

  it("trashes the top two cards from every opposing stack and restricts the resulting stackless Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-067", as: "summon" }],
          battleArea: [
            { card: "EX7-048", as: "musketeer" },
            { card: "EX7-016", as: "blue" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "stacked",
              under: [
                { card: "BT1-010", as: "underOne" },
                { card: "BT1-010", as: "underTwo" },
              ],
            },
            { card: "BT1-009", as: "empty" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("summon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("stacked").stack.length === 0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("underOne").instanceId, s.inst("underTwo").instanceId]),
    );
    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "attack")).toBe(true);
  });

  it("plays an Ice-Snow Digimon when no opposing stack card was trashed, then restricts stackless attackers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-067", as: "summon" },
            { card: "EX7-016", as: "ice" },
          ],
          battleArea: [
            { card: "EX7-048", as: "musketeer" },
            { card: "EX7-016", as: "blue" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "empty" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("summon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("ice").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("ice").instanceId),
    ).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(true);
  });

  it.each([
    ["EX7-021", "level 5 Ice-Snow"],
    ["BT1-009", "level 3 non-Ice-Snow"],
  ])("does not free-play a %s (%s)", async (candidate) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-067", as: "summon" },
            { card: candidate, as: "candidate" },
          ],
          battleArea: [{ card: "EX7-016", as: "blue" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "empty" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("summon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("empty"), "attack"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("allows the optional Ice-Snow play to be refused without skipping the final restriction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-067", as: "summon" },
            { card: "EX7-016", as: "ice" },
          ],
          battleArea: [{ card: "EX7-016", as: "blue" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "empty" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("summon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("empty"), "attack"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("ice").instanceId);
  });

  it("keeps the attack restriction through the opponent turn and expires it afterward", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-067", as: "summon" }],
          battleArea: [{ card: "EX7-016", as: "blue" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "empty" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: false },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("summon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("empty"), "attack"));
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(false);
    await stopLoop(s, loop, 0);
  });

  it("resolves the same Main body from a real Security check and keeps Q3870's post-then restriction", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX7-067", as: "summon" }, "BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker" },
            { card: "BT1-009", as: "empty" },
          ],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isRestricted(s.perm("empty"), "attack")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
