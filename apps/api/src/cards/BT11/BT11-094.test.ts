import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT11-094.js";

describe("BT11-094 Mirei Mikagura", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-094")).toMatchObject({
      cardId: "BT11-094",
      colors: ["Purple", "Yellow"],
      kinds: ["Tamer"],
      playCost: 5,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "StartOfYourTurn", actions: [{ kind: "GainMemory", amount: 1 }] },
      {
        trigger: "YourTurn",
        actions: [
          { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
          { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost" }] },
    ]);
  });

  it("[Start of Your Turn] gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-094", dp: 0, as: "mireiPerm" }],
          deck: Array.from({ length: 5 }, () => "BT1-009"),
          hand: ["AD1-001"],
        },
        1: { deck: Array.from({ length: 5 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const _mireiPerm = s.perm("mireiPerm");

    s.state.memory = 3;
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i++) await Promise.resolve();

    expect(s.state.memory).toBe(4);

    s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("[Your Turn] digivolving into Angewomon suspends Mirei and plays LadyDevimon from hand for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-094", dp: 0, as: "mireiPerm" },
            { card: "BT10-074", dp: 2000, as: "base" },
          ],
          deck: ["BT1-009"],
          hand: [
            { card: "BT11-042", as: "angewomon" },
            { card: "BT11-083", as: "ladyDevimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const mireiPerm = s.perm("mireiPerm");
    const base = s.perm("base");
    const angewomon = s.inst("angewomon");
    const ladyDevimon = s.inst("ladyDevimon");

    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: angewomon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    await settle(() => mireiPerm.isSuspended);

    expect(mireiPerm.isSuspended).toBe(true);

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT11-083"));

    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT11-083")).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === ladyDevimon.instanceId)).toBe(false);
  });

  it("does not suspend or play a same-name counterpart", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-094", as: "mirei" },
            { card: "BT10-074", as: "base" },
          ],
          hand: [
            { card: "BT11-042", as: "evolving" },
            { card: "BT11-042", as: "same-name" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT11-042");

    expect(s.perm("mirei").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("same-name").instanceId)).toBe(true);
  });
});
