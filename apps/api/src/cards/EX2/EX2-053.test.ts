import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-053.js";

describe("EX2-053 ADR-08 Optimizer", () => {
  it("reveals three and plays a cost-10-or-lower D-Reaper with a loaded Mother", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046", "EX2-046"] },
          ],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-053", as: "played" }, "BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("played").instanceId),
    ).toBe(true);
  });

  it("does not reveal or play with only four Mother D-Reaper sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX2-007",
              as: "mother",
              under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046"],
            },
          ],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-050", as: "candidate" }, "BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("optimizer").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("optimizer").instanceId,
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("candidate").instanceId,
      ),
    ).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("reveals and plays a qualifying D-Reaper from the When Attacking timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-053", as: "optimizer" },
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046", "EX2-046"] },
          ],
          deck: [{ card: "EX2-050", as: "played" }, "BT1-001", "BT1-002"],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("optimizer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId),
    ).toBe(true);
  });

  it("does not play a revealed D-Reaper whose play cost is above 10", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046", "EX2-046"] },
          ],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [{ card: "EX2-054", as: "tooExpensive" }, "BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tooExpensive").instanceId),
    ).toBe(false);
  });

  it("returns all declined revealed cards to the deck top per errata", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046", "EX2-046"] },
          ],
          hand: [{ card: "EX2-053", as: "optimizer" }],
          deck: [
            { card: "EX2-050", as: "candidate" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: false, autoOrderTriggers: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("optimizer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    const decision = s.state.pendingDecision!;
    expect(["optional", "selectCards"]).toContain(decision.kind);
    let response: { kind: "optional"; accept: boolean } | { kind: "selectCards"; instanceIds: string[] };
    if (decision.kind === "optional") {
      response = { kind: "optional", accept: false };
    } else {
      response = { kind: "selectCards", instanceIds: [] };
    }
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("candidate").instanceId,
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
  });

  it("shares one Once Per Turn budget between On Play and When Attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-053", as: "optimizer" },
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046", "EX2-046"] },
          ],
          deck: [
            { card: "EX2-050", as: "played" },
            { card: "BT1-001", as: "first" },
            { card: "BT1-002", as: "second" },
          ],
        },
        1: { security: ["BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("optimizer"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("played").instanceId),
    );
    const revealsAfterOnPlay = s.events.filter((event) => event.kind === "cardRevealed").length;
    expect(revealsAfterOnPlay).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("optimizer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.filter((event) => event.kind === "cardRevealed")).toHaveLength(revealsAfterOnPlay);
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "EX2-050")).toHaveLength(1);
  });
});
