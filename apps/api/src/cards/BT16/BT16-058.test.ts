import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-058.js";
import "../index.js";

describe("BT16-058", () => {
  it("models Collision", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Collision" }] });
  });

  it("draws by trashing a card and gives opponent Digimon an attack effect when SoC is underneath", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Draw",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash" },
      });
      // "Then, ..." after a paid cost is mandatory: the aura is gated by the [SoC] condition
      // alone, never by a second confirmation prompt.
      expect(effect.actions?.[1]).toMatchObject({
        kind: "GrantAuraToOpponents",
        condition: { kind: "selfDigivolutionStackMatchesFilter", filter: { kind: ["Tamer"] } },
        optional: false,
        duration: "untilOpponentTurnEnd",
      });
    }
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("naturally trashes and draws on digivolution, then installs the SoC-gated opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-051", as: "dorumon", under: ["BT14-087"] }],
          hand: [
            { card: "BT16-058", as: "dorugamon" },
            { card: "BT1-001", as: "discarded" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "recipient" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const engine = s.engine as unknown as {
      continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] };
    };

    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dorumon").permanentId,
        instanceId: s.inst("dorugamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("dorumon").topCard.cardId === "BT16-058");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("discarded").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
    await settle(() =>
      engine.continuous.listCustomEffectGrants().some(
        (grant) =>
          grant.instanceId === s.inst("recipient").instanceId &&
          grant.token === "[Start of Your Main Phase] This Digimon attacks.",
      ),
    );
  });
});
