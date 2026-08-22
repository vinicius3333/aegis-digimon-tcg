import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-024.js";
import "../index.js";

const CARD_ID = "BT26-024";

describe("BT26-024 Tinkermon", () => {
  it("encodes normal WG evolution, other-trait play watcher, free digivolution, and inherited Barrier", () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({ level: 2, traits: ["WG"], cost: 0, isAlternate: true });
    expect(compiled.effects).toMatchObject([
      { trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { excludeSelf: true }, actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, optional: true }] }] },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Barrier" }] },
    ]);
  });

  it("publicly reacts to another trait Digimon's play and digivolves without paying memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "tinkermon" }],
        hand: [{ card: "BT26-034", as: "playedVegetation" }, { card: "BT26-027", as: "petermon" }],
        deck: ["BT1-009"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedVegetation").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tinkermon").topCard.instanceId === s.inst("petermon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("grants inherited Barrier only while Tinkermon is under another Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-059", as: "host", under: [{ card: CARD_ID, as: "inherited" }] }, { card: CARD_ID, as: "top" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });
});
