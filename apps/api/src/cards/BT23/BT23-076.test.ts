import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-076.js";

describe("BT23-076 Sistermon Blanc", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-076")).toMatchObject({
      cardId: "BT23-076",
      nameEn: "Sistermon Blanc",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 3000,
      evoCosts: [],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Puppet", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("moves the old top security to hand and recovers the deck top in exact order", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-076", as: "blanc" }],
        security: [{ card: "BT1-009", as: "oldSecurity" }],
        deck: [{ card: "BT1-010", as: "recovered" }],
      },
    });
    const oldId = s.inst("oldSecurity").instanceId;
    const recoveredId = s.inst("recovered").instanceId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("blanc").permanentId });

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === oldId)).toBe(true);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: recoveredId, faceUp: false });
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("when this card suspends, evolves another Digimon from hand with cost reduced by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "huckmon" },
          ],
          hand: [{ card: "BT13-013", as: "baoHuckmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("blanc").permanentId,
    });

    expect(s.perm("huckmon").topCard?.cardId).toBe("BT13-013");
    expect(s.state.memory).toBe(4);
  });

  it("does not react when a different Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-076", as: "blanc" },
            { card: "BT23-006", as: "huckmon" },
          ],
          hand: [{ card: "BT13-013", as: "baoHuckmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSuspended", {
      subjectPermanentId: s.perm("huckmon").permanentId,
    });

    expect(s.perm("huckmon").topCard?.cardId).toBe("BT23-006");
    expect(s.state.memory).toBe(5);
  });

  it("adds the top security card to hand, then performs Recovery +1 from deck", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay") as any;
    expect(effect.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1 },
      { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 },
    ]);
    expect(effect.keywords).toBeUndefined();
  });

  it("only reacts when this Sistermon Blanc suspends and offers the reduced digivolution", () => {
    const watcher = (compiled.effects.find((entry) => entry.trigger === "YourTurn") as any).actions[0];
    expect(watcher.sourceFilter).toEqual({ isSelfRef: true });
    expect(watcher.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand", "trash"],
      payCost: true,
      reduceCost: 1,
      optional: true,
    });
  });
});
