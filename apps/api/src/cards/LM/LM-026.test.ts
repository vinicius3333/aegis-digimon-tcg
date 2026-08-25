import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./LM-026.js";
// BT17-010 supplies the numeric DP-based deletion this inherited modifier raises.
import "../BT17/BT17-010.js";

describe("LM-026 Megidramon", () => {
  it("registers complete leave replacement, rule name, and inherited deletion ceiling IR", () => {
    const compiled = runtimeCompiledCard("LM-026")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(
      compiled.effects.find((effect) => effect.actions.some((action) => action.kind === "Replacement")),
    ).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          playAndRelocateSourceUnder: { from: ["digivolutionCards", "trash"] },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)?.actions).toEqual([
      expect.objectContaining({ kind: "DeletionMaxDpModifier", amount: 5000 }),
    ]);
  });

  it("deletes only opposing Digimon at 11000 DP or less", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-026", as: "megidramon" }] },
        1: {
          battleArea: [
            { card: "BT1-081", as: "low" },
            { card: "BT1-082", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("megidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"));
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-082")).toBe(true);
  });

  it("replaces its own leave with a Guilmon host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-026", as: "megidramon" }], trash: ["BT2-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT2-009")).toBe(true);
    expect(
      s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT2-009")!.stack.map(
        (card) => card.cardId,
      ),
    ).toEqual(["LM-026"]);
  });

  it("can play the Guilmon from its own digivolution cards for the replacement", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-026", under: ["BT2-009"], as: "megidramon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("megidramon").permanentId], "byEffect");
    const guilmon = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "BT2-009");
    expect(guilmon?.stack.map((card) => card.cardId)).toEqual(["LM-026"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("is also treated as ChaosGallantmon", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-026", as: "megidramon" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).effectiveNames(s.perm("megidramon"))).toContain("chaosgallantmon");
  });

  it("raises its host's own numeric deletion ceiling by 5000, per Q4031", async () => {
    const withMegidramon = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-010", as: "host", under: ["LM-026"] }] },
        1: { battleArea: [{ card: "BT1-081", as: "target", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withMegidramon.ready();

    // BT17-010 deletes a 4000-DP-or-lower Digimon; the inherited modifier lifts that to 9000.
    await advance(withMegidramon.engine).fire(EffectTiming.WhenDigivolving, withMegidramon.perm("host"));
    await settle(() => withMegidramon.state.players[1]!.battleArea.length === 0, 2000);
    expect(withMegidramon.state.players[1]!.battleArea).toHaveLength(0);

    const withoutMegidramon = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-010", as: "host" }] },
        1: { battleArea: [{ card: "BT1-081", as: "target", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withoutMegidramon.ready();

    await advance(withoutMegidramon.engine).fire(EffectTiming.WhenDigivolving, withoutMegidramon.perm("host"));
    await settle(() => withoutMegidramon.state.pendingDecision === null);
    expect(withoutMegidramon.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-026");
    const compiled = runtimeCompiledCard("LM-026");
    expect(definition?.nameEn).toBe("Megidramon");
    expect(definition?.colors).toEqual(["Purple", "Red"]);
    expect(definition?.isAce).toBe(true);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
