import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-018.js";

describe("LM-018 Gyuukimon", () => {
  it("deletes an opposing level-4 Digimon and plays its token when played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-018", as: "gyuukimon" }] },
        1: { battleArea: [{ card: "ST1-06", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token"),
      2000,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST1-06")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(true);
    expect(getCardDefinition("TOKEN-Gyuukimon-Token")).toMatchObject({
      level: 5,
      playCost: 7,
      dp: 3000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Dark Animal"],
    });
  });

  it("can take one of the controller's own level-4-or-lower Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "LM-018", as: "gyuukimon" }],
          battleArea: [{ card: "ST1-06", as: "mine" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("mine").permanentId);
    s.state.memory = 7;

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "ST1-06"), 2000);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "ST1-06")).toBe(true);
  });

  it("leaves a level-5 Digimon alone and plays no token", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-018", as: "gyuukimon" }] },
        1: { battleArea: [{ card: "BT1-020", as: "tooBig" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(false);
  });

  it("does not play the token when nothing was deleted", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "LM-018", as: "gyuukimon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(false);
  });

  it("leaves the token unplayed when the optional play is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-018", as: "gyuukimon" }] },
        1: { battleArea: [{ card: "ST1-06", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gyuukimon").instanceId });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "TOKEN-Gyuukimon-Token")).toBe(false);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-018");
    const compiled = runtimeCompiledCard("LM-018");
    expect(definition?.nameEn).toBe("Gyuukimon");
    expect(definition?.dp).toBe(7000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
