import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./BT17-094.js";

describe("BT17-094 Ancient Guardian Deity", () => {
  it("returns either a Hybrid or Ten Warriors Digimon from Trash", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      target: {
        filter: {
          zone: "trash",
          nameOrTrait: [
            { tokens: ["Hybrid"], match: "trait" },
            { tokens: ["Ten Warriors"], match: "trait", orPrevious: true },
          ],
        },
      },
    });
  });

  it("plays a Ten Warriors Digimon or inherited-effect Tamer with four-cost reduction", () => {
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: true,
      costReduction: 4,
      optional: true,
      target: {
        filter: {
          or: [
            { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ten Warriors"], match: "trait" }] },
            { kind: ["Tamer"], hasInheritedEffects: true },
          ],
        },
      },
    });
  });

  it("waives color requirements only while a Hybrid Tamer or Digimon is present", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: {
              or: [{ kind: ["Tamer"] }, { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] }],
            },
          },
        },
      ],
    });
  });

  it("requires an active Tamer to use the otherwise off-color Option", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-093", as: "tamer" }],
        hand: [{ card: "BT17-094", as: "option" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("naturally returns a Hybrid and plays a Ten Warriors Digimon for four less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-093", as: "tamer" }],
          hand: [
            { card: "BT17-094", as: "option" },
            { card: "BT17-017", as: "ancient" },
          ],
          trash: [{ card: "BT17-011", as: "hybrid" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-017"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-017")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hybrid").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("naturally plays only an inherited-effect Tamer from Security, then returns this Option to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT17-094", as: "securityOption" }],
          hand: [{ card: "BT17-083", as: "inheritedTamer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-083"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-083")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
  });
});
