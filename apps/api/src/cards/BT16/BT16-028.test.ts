import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-028.js";
import "../index.js";

describe("BT16-028", () => {
  it("matches the catalog identity and Fighter Mode evolution route", () => {
    expect(getCardDefinition("BT16-028")).toMatchObject({
      nameEn: "Imperialdramon: Dragon Mode",
      colors: ["Blue", "Green"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
      types: ["Ancient Dragon"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Paildramon", "Dinobeemon"], cost: 3, isAlternate: true },
    ]);
  });

  it("restricts an opposing Digimon or Tamer and unsuspends yours", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "suspend" },
    });
  });

  it("can DNA digivolve into Imperialdramon: Fighter Mode when an opponent's effect plays or digivolves", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [{ kind: "Digivolve", payCost: false, from: ["hand"], optional: true }],
    });
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
    });
    expect(compiled.effects?.[1]?.actions?.[0]?.actions?.[0]?.condition).toMatchObject({
      kind: "allOf",
      conditions: [{ kind: "youHave" }, { kind: "triggerPlayedOrDigivolvedByEffect" }],
    });
    expect(compiled.effects?.[1]?.actions?.[1]?.actions?.[0]?.condition).toMatchObject({
      kind: "allOf",
      conditions: [{ kind: "youHave" }, { kind: "triggerPlayedOrDigivolvedByEffect" }],
    });
  });

  it("restricts an opponent and pays by suspending them to unsuspend your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-025", as: "source", suspended: true }],
          hand: [{ card: "BT16-028", as: "dragonMode" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("dragonMode").instanceId,
      }),
    ).toEqual({ ok: true });

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspend")).toBe(true);
  });

  it("Blast Digivolves naturally when an opponent's effect plays a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-028", as: "source" }, { card: "BT1-087", as: "tamer" }],
          hand: [{ card: "BT16-027", as: "fighterMode" }],
        },
        1: {
          hand: [
            { card: "BT5-092", as: "nokia" },
            { card: "BT5-007", as: "agumon" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("nokia").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").topCard?.cardId === "BT16-027");

    expect(s.perm("source").topCard?.cardId).toBe("BT16-027");
  });

  it("Blast Digivolves naturally when an opponent's effect digivolves a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-028", as: "source" }, { card: "BT1-087", as: "tamer" }],
          hand: [{ card: "BT16-027", as: "fighterMode" }],
        },
        1: {
          hand: [{ card: "BT16-030", as: "salamon" }],
          trash: [{ card: "BT16-031", as: "gatomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("salamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("source").topCard?.cardId === "BT16-027");

    expect(s.perm("source").topCard?.cardId).toBe("BT16-027");
  });
});
