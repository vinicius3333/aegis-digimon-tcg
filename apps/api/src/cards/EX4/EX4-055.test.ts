import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-055.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";

describe("EX4-055 Peckmon", () => {
  it("matches the catalog and is registered as complete IR", () => {
    expect(getCardDefinition("EX4-055")).toMatchObject({
      cardId: "EX4-055",
      nameEn: "Peckmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      types: ["Avian"],
      effectText: expect.stringContaining("[Keenan Crier]"),
      inheritedEffectText: expect.stringContaining("deleted outside of a battle"),
    });
    expect(runtimeCompiledCard("EX4-055")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("optionally plays Keenan Crier from hand if none is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Keenan Crier"] }] } },
      condition: { kind: "youHaveNone" },
    });
  });
  it("inherits opponent-chosen hand trashing when deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      target: { filter: { controller: "opponent", zone: "hand" } },
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-055");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("plays Keenan Crier from hand for free when none is already in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX4-055", as: "source" }], hand: [{ card: "EX4-064", as: "keenan" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-064"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-064")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("keenan").instanceId)).toBe(false);
  });

  it("does not play another Keenan Crier when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-055", as: "source" },
            { card: "EX4-064", as: "existingKeenan" },
          ],
          hand: [{ card: "EX4-064", as: "handKeenan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handKeenan").instanceId);
  });

  it("does not play a longer Tamer name as exact Keenan Crier", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-055", as: "source" }],
          hand: [{ card: "ST24-14", as: "longKeenanName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("longKeenanName").instanceId);
  });

  it("may decline playing Keenan Crier", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX4-055", as: "source" }], hand: [{ card: "EX4-064", as: "keenan" }] } },
      { autoAcceptOptional: false, autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("keenan").instanceId);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-064")).toBe(false);
  });

  it("trashes exactly one opponent hand card when an inherited host is deleted outside battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-054", as: "host", under: ["EX4-055"] }] },
        1: {
          hand: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("does not trash an opponent hand card when the inherited host is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-054", as: "host", under: ["EX4-055"] }] },
        1: { hand: [{ card: "BT1-009", as: "opponentCard" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    await settle();
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentCard").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("does not create a trash when the opponent has no hand cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX4-054", as: "host", under: ["EX4-055"] }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  ex4CardBehaviorTests("EX4-055");
});
