import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-068.js";
describe("BT11-068 Mamemon", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-068")).toMatchObject({
      cardId: "BT11-068",
      colors: ["Black"],
      level: 5,
      playCost: 7,
      dp: 6000,
      types: ["Mutant"],
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 5 }] },
      { trigger: "WhenDigivolving", actions: [{ kind: "RevealAdd", revealCount: 5 }] },
      { trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" },
    ]);
  });

  it("registers both reveal timings as dedicated effects", () => {
    const compiled = runtimeCompiledCard("BT11-068")!;
    expect(
      compiled.effects.filter(({ trigger }) => trigger === "OnPlay" || trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(compiled.effects.find(({ isInherited }) => isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { byEffect: true } }],
    });
  });

  it("reveals 5 on play and plays an eligible Tamer without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT11-068", as: "mamemon" }],
          deck: ["BT1-088", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mamemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-088"));

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-088")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("grants Blocker only after another Digimon is played by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-069", as: "host", under: ["BT11-068"] },
            { card: "BT1-010", as: "played" },
            { card: "BT1-011", as: "recipient" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const payload = { subjectPermanentId: s.perm("played").permanentId };

    await advance(s.engine).fireSubTrigger("whenPlayed", payload);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Blocker")).toBe(false);

    await advance(s.engine).fireSubTrigger("whenPlayed", { ...payload, playedByEffect: true });
    await settle(() =>
      ["host", "played", "recipient"].some((alias) => observe(s.engine).hasKeyword(s.perm(alias), "Blocker")),
    );

    expect(
      ["host", "played", "recipient"].filter((alias) => observe(s.engine).hasKeyword(s.perm(alias), "Blocker")),
    ).toHaveLength(1);
  });
});
