import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT23-092.js";

describe("BT23-092 Ice Archery", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-092")).toMatchObject({
      cardId: "BT23-092",
      nameEn: "Ice Archery",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0].condition.filter.zone,
    ).toBe("field");
  });

  it("pays intrinsic Delay on a CS attack and restricts one opposing Digimon and Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-092", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: {
          security: ["BT1-001", "BT1-002"],
          battleArea: [
            { card: "BT1-009", as: "digimon" },
            { card: "BT23-081", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "suspend")).toBe(true);
  });

  it("does not consume Delay for a non-CS attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-092", as: "option" },
            { card: "BT1-009", as: "nonCsAttacker" },
          ],
        },
        1: {
          security: ["BT1-001", "BT1-002"],
          battleArea: [
            { card: "BT1-009", as: "digimon" },
            { card: "BT23-081", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nonCsAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "suspend")).toBe(false);
  });

  it("restricts one opposing Digimon and Tamer before placing itself", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    expect(main.actions).toMatchObject([
      { kind: "Restrict", restriction: "suspend" },
      { kind: "Restrict", restriction: "suspend" },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect(main.actions[0].target.filter.kind).toEqual(["Digimon"]);
    expect(main.actions[1].target.filter.kind).toEqual(["Tamer"]);
  });

  it("activates Delay on a CS attack and keeps the Security sequence", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0].actions).toHaveLength(2);
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(security.actions[2]).toMatchObject({ kind: "PlaceInBattleAreaSelf" });
  });
});
