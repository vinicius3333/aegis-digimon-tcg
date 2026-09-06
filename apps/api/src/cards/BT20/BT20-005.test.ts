import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT18/BT18-086.js";
import "./index.js";
import { compiled } from "./BT20-005.js";

describe("BT20-005 Kapurimon", () => {
  it("grants Jamming only when this Digimon checks face-up security", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect?.trigger).toBe("YourTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenCheckedFaceUpSecurity",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "GainKeyword", duration: "forTheTurn", target: { isSelf: true } }],
    });
  });

  it("observably grants Jamming for a pre-existing face-up check but not a normal reveal", async () => {
    const faceUp = setupEngine({
      0: { battleArea: [{ card: "BT20-046", dp: 3000, as: "attacker", under: ["BT20-005"] }] },
      1: { security: [{ card: "BT1-015", faceUp: true }] },
    });
    expect(
      faceUp.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: faceUp.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(faceUp.engine).hasKeyword(faceUp.perm("attacker"), "Jamming"));
    expect(observe(faceUp.engine).hasKeyword(faceUp.perm("attacker"), "Jamming")).toBe(true);
    expect(faceUp.state.players[0]!.battleArea).toHaveLength(1);

    const faceDown = setupEngine({
      0: { battleArea: [{ card: "BT20-046", dp: 3000, as: "attacker", under: ["BT20-005"] }] },
      1: { security: ["BT1-015"] },
    });
    expect(
      faceDown.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: faceDown.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => faceDown.state.players[1]!.security.length === 0);
    expect(faceDown.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not grant Jamming when another allied Digimon checks face-up security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-046", dp: 3000, as: "host", under: ["BT20-005"] },
          { card: "BT20-046", dp: 3000, as: "otherAttacker" },
        ],
      },
      1: { security: [{ card: "BT1-015", faceUp: true }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });
  it("acquires Jamming after a legal breeding evolution and expires at real turn end", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT20-005", as: "egg" },
        hand: [{ card: "BT20-046", as: "espimon" }, "BT20-010"],
        deck: ["BT1-001", "BT1-001"],
      },
      1: { security: [{ card: "BT1-015", faceUp: true }] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("espimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT20-046");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT20-005"]);
    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("egg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "securityChecked" }));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect({
      phase: s.state.phase,
      memory: s.state.memory,
      seat: s.state.turnSeat,
      jamming: observe(s.engine).hasKeyword(s.perm("egg"), "Jamming"),
    }).toMatchObject({ phase: Phase.Main, jamming: true });
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(observe(s.engine).hasKeyword(s.perm("egg"), "Jamming")).toBe(false);
  });

  it("Q4284: resolves a face-up Security effect decision before the inherited Jamming trigger", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT20-046", dp: 3000, as: "attacker", under: ["BT20-005"] }] },
        1: { security: [{ card: "BT18-086", faceUp: true }], trash: [{ card: "BT18-034", as: "lucemon" }] },
      },
      { autoOrderTriggers: false, autoAcceptOptional: false, autoSelectCards: false },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.length > 0);
    const first = s.decisions[0]!;
    expect({ seat: first.seat, kind: first.req.kind }).toEqual({ seat: 1, kind: "optional" });
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: first.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming"));
    expect(observe(s.engine).hasKeyword(s.perm("attacker"), "Jamming")).toBe(true);
  });
});
