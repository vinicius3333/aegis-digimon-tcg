import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-025.js";

describe("EX8-025", () => {
  it("places a DS Digimon from trash underneath itself on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      optional: true,
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
    });
  });
  it("plays a level 5 or lower DS Digimon from its digivolution cards at end of attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["digivolutionCards"],
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
        },
      ],
    });
  });
  it("inherits attack-target switch prevention during its controller's turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "Restrict", restriction: "attackTargetChange", duration: "permanent" }],
    }));
  it("places a DS card from trash under Whamon on live On Play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX8-025", as: "whamon" }], trash: [{ card: "EX8-027", as: "ds" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX8-025" && p.stack.length === 1),
    );
    const whamon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "EX8-025");
    expect(whamon?.stack).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-027")).toBe(false);
  });

  it("places a DS trash card at the true bottom when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-020", as: "base", under: [{ card: "EX8-017", as: "existing" }] }],
          hand: [{ card: "EX8-025", as: "whamon" }],
          trash: [{ card: "EX8-017", as: "ds" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("whamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 3);

    expect(s.perm("base").stack[0]!.instanceId).toBe(s.inst("ds").instanceId);
    expect(s.perm("base").stack[1]!.instanceId).toBe(s.inst("existing").instanceId);
  });

  it("plays only one eligible DS card from its own stack across two attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX8-025",
              as: "whamon",
              under: [
                { card: "EX8-020", as: "first" },
                { card: "EX8-021", as: "second" },
              ],
            },
            { card: "BT8-030", as: "otherHost", under: [{ card: "EX8-025", as: "foreign" }] },
          ],
        },
        1: { security: 2 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("whamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await advance(s.engine).verb.unsuspend([s.perm("whamon").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("whamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.perm("otherHost").stack.some((card) => card.instanceId === s.inst("foreign").instanceId)).toBe(true);
    expect(s.perm("whamon").stack).toHaveLength(1);
  });

  it("keeps the On Play placement optional when declined", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX8-025", as: "whamon" }], trash: [{ card: "EX8-027", as: "ds" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("whamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-025"));

    const whamon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX8-025");
    expect(whamon?.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-027")).toBe(true);
  });

  it("keeps the End of Attack playback optional when declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-025", as: "whamon", under: ["EX8-020"] }] },
        1: { security: 1 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("whamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("whamon").stack).toHaveLength(1);
    expect(s.perm("whamon").isSuspended).toBe(true);
  });

  it("applies the inherited attack-target-change restriction only on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-030", as: "host", under: ["EX8-025"] }] } });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestricted(s.perm("host"), "attackTargetChange")).toBe(false);
  });
});
