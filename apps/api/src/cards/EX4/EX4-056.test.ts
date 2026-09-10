import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-056.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";

describe("EX4-056 Crowmon", () => {
  it("matches the catalog and has complete exclusive IR registration", () => {
    expect(getCardDefinition("EX4-056")).toMatchObject({
      cardId: "EX4-056",
      nameEn: "Crowmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Mysterious Bird"],
    });
    expect(runtimeCompiledCard("EX4-056")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("may digivolve into Ravemon from hand when a purple Tamer is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: true,
      optional: true,
      into: { nameOrTrait: [{ match: "nameExact", tokens: ["Ravemon"] }] },
      condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Purple"] } },
    });
  });
  it("inherits deletion of an opposing level five or lower Digimon outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 5 } } },
          condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
        },
      ],
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-056");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("deletes one opposing level-five-or-lower Digimon after an outside-battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX4-056"] }] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "low" },
            { card: "AD1-025", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-013")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "AD1-025")).toBe(true);

    const battle = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX4-056"] }] },
      1: { battleArea: [{ card: "BT1-013", as: "low" }] },
    });
    await battle.ready();
    await advance(battle.engine).verb.deletePermanent([battle.perm("host").permanentId], "byBattle");
    await settle();
    expect(battle.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-013")).toBe(true);
  });

  it("publicly attacks and optionally pays Ravemon's 4-memory evolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-056", as: "subject" },
            { card: "EX4-064", as: "tamer" },
          ],
          hand: [{ card: "BT13-089", as: "ravemon" }],
          deck: ["BT1-009", "BT1-013", "BT1-012"],
          security: ["BT1-009", "BT1-013", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "attackTarget", suspended: true }],
          security: ["BT1-009", "BT1-013", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("subject").permanentId,
        target: { kind: "digimon", permanentId: s.perm("attackTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("subject").topCard?.cardId === "BT13-089");
    expect(s.perm("subject").topCard?.cardId).toBe("BT13-089");
    expect(s.perm("subject").stack.map((card) => card.cardId)).toContain("EX4-056");
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ravemon").instanceId)).toBe(false);
  });

  it("declines the optional attack evolution and does not consume memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-056", as: "subject" },
            { card: "EX4-064", as: "tamer" },
          ],
          hand: [{ card: "EX4-058", as: "ravemon" }],
          security: ["BT1-009", "BT1-013", "BT1-012"],
        },
        1: { security: ["BT1-009", "BT1-013", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("subject").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("subject").topCard?.cardId === "EX4-056");
    expect(s.perm("subject").topCard?.cardId).toBe("EX4-056");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ravemon").instanceId)).toBe(true);
  });

  it("does not delete an opposing level-six Digimon and is a no-op without a qualifying target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX4-056"] }] },
      1: { battleArea: [{ card: "EX4-058", as: "high" }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["EX4-058"]);
  });

  ex4CardBehaviorTests("EX4-056");
});
