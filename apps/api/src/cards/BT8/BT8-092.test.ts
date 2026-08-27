import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, getCompiledCard, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-092.js";

describe("BT8-092 Yuji Musya", () => {
  it("matches its official metadata and typed effect contract", () => {
    expect(getCardDefinition("BT8-092")).toMatchObject({
      nameEn: "Yuji Musya",
      colors: ["Black"],
      playCost: 3,
      kinds: ["Tamer"],
    });
    expect(getCompiledCard("BT8-092")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains 1 memory and draws when an X-Antibody Digimon moves out of breeding", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-092", as: "yuji" }],
        breeding: { card: "BT8-060", as: "mover" },
        deck: [{ card: "BT8-033", as: "drawn" }],
      },
    });
    s.state.phase = Phase.Breeding;
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.memory).toBe(1);
  });

  it("suspends to place an X-Antibody card under the attacking black X-Antibody Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-092", as: "yuji" },
            { card: "BT8-063", as: "attacker" },
          ],
          hand: [{ card: "BT8-060", as: "placed" }],
        },
        1: { security: ["BT8-033"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").stack.some((card) => card.instanceId === s.inst("placed").instanceId));

    expect(s.perm("yuji").isSuspended).toBe(true);
    expect(s.perm("attacker").stack.at(-1)?.instanceId).toBe(s.inst("placed").instanceId);
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT8-092", as: "security", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("security").instanceId,
      ),
    ).toBe(true);
  });
});
