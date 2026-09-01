import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-050.js";
import "./index.js";

describe("BT22-050 Roamon", () => {
  it("plays itself at the end of the battle when revealed from security", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      timing: "endOfBattle",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, isSelf: true }, payCost: false }],
    });
  });

  it("suspends one opposing Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("links to an Appmon for 2 and suspends an opponent through When Linking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: "BT22-050", as: "roamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("roamon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked.some((card) => card.cardId === "BT22-050")).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("plays normally and suspends one opponent Digimon", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT22-050", as: "roamon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("roamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("plays from security after a public security attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: { security: [{ card: "BT22-050", as: "roamon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT22-050"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT22-050")).toBe(true);
  });
});
