import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-022.js";

describe("BT15-022", () => {
  it("publishes inherited Jamming without a broad battle-deletion restriction", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
      actions: [],
    }));
  it("restricts an opposing Digimon from attacking when played by an effect", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "triggerEnteredByEffect" },
        },
      ],
    }));
  it("locks an opposing Digimon only when its On Play source entered by an effect", async () => {
    const effectPlayed = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-022", as: "betamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(effectPlayed.engine).fireForPermanent(
      EffectTiming.OnPlay,
      effectPlayed.perm("betamon"),
      { enteredByEffect: 0 },
    );
    await settle(() => observe(effectPlayed.engine).isRestricted(effectPlayed.perm("target"), "attack"));

    expect(observe(effectPlayed.engine).isRestricted(effectPlayed.perm("target"), "attack")).toBe(true);
    advance(effectPlayed.engine).ledgers.continuous.sweep(effectPlayed.state, "ownerTurnEnd", 0);
    expect(observe(effectPlayed.engine).isRestricted(effectPlayed.perm("target"), "attack")).toBe(true);
    advance(effectPlayed.engine).ledgers.continuous.sweep(effectPlayed.state, "ownerTurnEnd", 1);
    expect(observe(effectPlayed.engine).isRestricted(effectPlayed.perm("target"), "attack")).toBe(false);

    const normallyPlayed = setupEngine(
      {
        0: { battleArea: [{ card: "BT15-022", as: "betamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(normallyPlayed.engine).fireForPermanent(
      EffectTiming.OnPlay,
      normallyPlayed.perm("betamon"),
      {},
    );

    expect(observe(normallyPlayed.engine).isRestricted(normallyPlayed.perm("target"), "attack")).toBe(false);
  });

  it("keeps its inherited host alive against a stronger Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-022"] }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
  });

  it("does not protect its inherited host in battle against an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT15-022"] }] },
      1: { battleArea: [{ card: "BT1-081", as: "defender", suspended: true }] },
    });
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
  });
});
