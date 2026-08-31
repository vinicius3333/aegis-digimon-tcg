import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST19/ST19-12.js";
import "./P-165.js";

describe("P-165 ShoeShoemon", () => {
  it("encodes Security end-of-battle play and On Play/When Digivolving Familiar Token creation", () => {
    const compiled = runtimeCompiledCard("P-165")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [{ kind: "PlayWithoutCost", from: ["security"], payCost: false }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlayToken", tokens: ["Familiar Token"], count: 1, payCost: false },
          {
            kind: "DelayedDelete",
            timing: "endOfOpponentTurn",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }] },
              count: 1,
            },
          },
        ],
      });
    }
  });

  it("uses the Familiar Token's own deletion effect and encodes inherited Barrier", () => {
    const compiled = runtimeCompiledCard("P-165")!;
    expect(
      compiled.effects.some((effect) => (effect.actions ?? []).some((action) => action.kind === "SubTrigger")),
    ).toBe(false);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
    expect(runtimeCompiledCard("TOKEN-Familiar-Token")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnDeletion",
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" })],
        }),
      ]),
    );
  });

  it("plays exactly one Familiar Token from On Play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-165", as: "shoe" }] } });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoe"));
    await settle();
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "TOKEN-Familiar-Token")).toHaveLength(1);
  });

  it("plays the token from When Digivolving and its deletion reduces an opposing Digimon by 3000", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-165", as: "shoe" },
            { card: "BT1-009", as: "host", under: ["P-165"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-025", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shoe"));
    await settle();
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "TOKEN-Familiar-Token");
    expect(token).toBeDefined();
    await advance(s.engine).verb.deletePermanent([token!.permanentId], "byEffect");
    await settle();
    expect(s.perm("opponent").currentDP).toBe(8000);
  });

  it("plays from Security at end of a real battle", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-165", as: "shoe" }, "BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
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
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-165"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-165")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("deletes its Familiar Token at the real opponent-turn boundary", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-165", as: "shoe" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoe"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Familiar-Token"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Familiar-Token")).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Familiar-Token")).toBe(false);
  });
});
