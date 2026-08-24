import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-058.js";
import "../index.js";

describe("BT26-058 HiAndromon", () => {
  it("encodes Reboot/Blocker, shared CS protection, and leave prevention paid by rotating its stack", () => {
    expect(digivolutionRequirementsFor("BT26-058")).toContainEqual({
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Reboot" }),
        expect.objectContaining({ keyword: "Blocker" }),
      ]),
    );
    expect(compiled.effects?.[1]?.sharedUseKey).toBe("bt26-058-protect-cs");
    expect(compiled.effects?.[2]?.sharedUseKey).toBe("bt26-058-protect-cs");
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
          actions: [{ kind: "Prevent", cost: { kind: "placeOwnTopAtStackBottom" } }],
        },
      ],
    });
  });

  it("publicly protects a CS Digimon from opposing Digimon effects during its protection window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-058", as: "hiAndromon" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("hiAndromon"));

    const continuous = (
      s.engine as unknown as { continuous: { hasRestriction: (id: string, kind: string, source?: string) => boolean } }
    ).continuous;
    expect(continuous.hasRestriction(s.perm("hiAndromon").permanentId, "beAffected", "Digimon")).toBe(true);
  });

  it("prevents a CS Digimon leaving by rotating HiAndromon's top card to its stack bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-058", as: "hiAndromon", under: [{ card: "BT26-054", as: "rotation" }] },
            { card: "BT26-054", as: "protected" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const protectedId = s.perm("protected").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([protectedId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === protectedId)).toBe(true);
    expect(s.perm("hiAndromon").topCard.cardId).toBe("BT26-054");
    expect(s.perm("hiAndromon").stack[0]?.cardId).toBe("BT26-058");
  });
});
