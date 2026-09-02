import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-096.js";

describe("BT23-096 Comet Hammer", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-096")).toMatchObject({
      cardId: "BT23-096",
      nameEn: "Comet Hammer",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(
      (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0].condition.filter.zone,
    ).toEqual(["battleArea", "breeding"]);
  });

  it("waives the black color requirement from an off-color CS Digimon in breeding", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-008", as: "csInBreeding" },
        hand: [{ card: "BT23-096", as: "option" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
  });

  it("pays Delay and de-digivolves up to four cards from a realistic opposing stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-096", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-015", as: "target", under: ["BT23-001", "BT23-005", "BT23-010", "BT23-012"] }],
          security: 2,
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
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("target").topCard?.cardId).toBe("BT23-005");
  });

  it("does not pay Delay when a non-CS Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-096", as: "option" },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-015", as: "target", under: ["BT23-010"], suspended: false }],
          security: 2,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    s.perm("option").placedByEffect = true;
    const targetId = s.perm("target").topCard!.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("target").topCard?.instanceId).toBe(targetId);
  });

  it("activates Delay when a CS Digimon attacks and de-digivolves in that window", () => {
    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.actions).toHaveLength(1);
    expect(turn.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(turn.keywords[0].keyword).toBe("Delay");
    expect(turn.actions[0].actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 4 });
  });

  it("keeps the Main and Security de-digivolve-then-place sequences", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(main.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(security.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
  });
});
