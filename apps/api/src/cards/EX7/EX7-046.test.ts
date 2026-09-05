import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-046.js";

describe("EX7-046", () => {
  it("de-digivolves an opposing Digimon by 1 to level 3 on play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      stopAtLevel: 3,
    }));
  it("gains 1 memory when the opponent has no level 5 or higher Digimon and inherits once-per-turn attack redirection", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHasNone" },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
      ],
    });
  });

  it("publicly de-digivolves on play and gains memory only when no opposing level 5 exists", async () => {
    const onPlay = setupEngine({
      0: { battleArea: [{ card: "EX7-046", as: "jazar" }] },
      1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
    });
    await onPlay.ready();
    await advance(onPlay.engine).fire(EffectTiming.OnPlay, onPlay.perm("jazar"));
    expect(onPlay.perm("target").stack).toHaveLength(0);

    const withNoLevelFive = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-041", as: "base" }], hand: [{ card: "EX7-046", as: "jazar" }] },
        1: { battleArea: [{ card: "BT1-009", as: "small" }] },
      },
      { autoSelectCards: true },
    );
    withNoLevelFive.state.memory = 5;
    await withNoLevelFive.ready();
    expect(
      withNoLevelFive.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: withNoLevelFive.perm("base").permanentId,
        instanceId: withNoLevelFive.inst("jazar").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => withNoLevelFive.perm("base").topCard.cardId === "EX7-046");
    expect(withNoLevelFive.state.memory).toBe(3);

    const withLevelFive = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-041", as: "base" }], hand: [{ card: "EX7-046", as: "jazar" }] },
        1: { battleArea: [{ card: "EX7-011", as: "large" }] },
      },
      { autoSelectCards: true },
    );
    withLevelFive.state.memory = 5;
    await withLevelFive.ready();
    expect(
      withLevelFive.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: withLevelFive.perm("base").permanentId,
        instanceId: withLevelFive.inst("jazar").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => withLevelFive.perm("base").topCard.cardId === "EX7-046");
    expect(withLevelFive.state.memory).toBe(2);
  });

  it("publicly redirects once per turn, then lets a second opponent attack reach security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-042", as: "host", under: ["EX7-046"], dp: 15000 }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 3000 },
            { card: "BT1-010", as: "secondAttacker", dp: 3000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
