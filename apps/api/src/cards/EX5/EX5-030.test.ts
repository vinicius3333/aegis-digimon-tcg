import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-030.js";
import "../index.js";

describe("EX5-030 Liamon", () => {
  it("is also treated as Leomon and may digivolve into a Leomon from hand for one less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions?.[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "name",
      tokens: ["Leomon"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      target: { filter: { isSelfRef: true } },
      from: ["hand"],
      reduceCost: 1,
      into: { kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Leomon"] }] },
    });
  });
  it("inherits -2000 DP to an opposing Digimon on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "untilOpponentTurnEnd",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("digivolves on attack into a legal Leomon-name card with one memory reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-030", as: "liamon" }],
          hand: [{ card: "EX5-049", as: "grapLeomon" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("liamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("liamon").topCard?.cardId === "EX5-049");

    expect(s.perm("liamon").topCard?.cardId).toBe("EX5-049");
    expect(s.state.memory).toBe(7);
  });

  it("does not ignore digivolution requirements for an ineligible Leomon-name card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-030", as: "liamon" }],
          hand: [{ card: "BT1-035", as: "ineligibleLeomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("liamon"));
    await settle();

    expect(s.perm("liamon").topCard?.cardId).toBe("EX5-030");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-035");
  });

  it("is treated as Leomon for the printed alternate digivolution requirement", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-027", as: "liollmon" }], hand: [{ card: "EX5-030", as: "liamon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("liollmon").permanentId,
        instanceId: s.inst("liamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("liollmon").topCard?.cardId === "EX5-030");
    expect(s.perm("liollmon").topCard?.cardId).toBe("EX5-030");
  });

  it("reduces an opposing Digimon's DP when an inherited host is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-030"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent", dp: 5000 }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.perm("opponent").currentDP === 3000);
    expect(s.perm("opponent").currentDP).toBe(3000);
  });
});
