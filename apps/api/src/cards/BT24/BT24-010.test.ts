import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-010.js";
import "../index.js";

describe("BT24-010 Greymon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition("BT24-010")).toMatchObject({
      cardId: "BT24-010",
      nameEn: "Greymon",
      colors: ["Red", "Black"],
      kinds: ["Digimon"],
      level: 4,
      types: ["Dinosaur", "Titan", "TS"],
    });
  });

  it("grants Blocker and De-Digivolves one opponent Digimon on deletion", () => {
    expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Blocker");
    const deletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")?.actions?.[0] as any;
    expect(deletion).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("retains inherited Raid and alternate requirements", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Raid");
    expect(compiled.digivolutionRequirement ?? []).toHaveLength(2);
  });

  it("De-Digivolves exactly one opposing stack when deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-010", as: "greymon" }] },
        1: {
          battleArea: [
            { card: "BT24-010", as: "target", under: ["BT24-009"] },
            { card: "BT24-010", as: "other", under: ["BT24-009"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const deletedTopId = s.perm("target").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("greymon").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === deletedTopId));

    expect(s.perm("target").topCard.cardId).toBe("BT24-009");
    expect(s.perm("other").topCard.cardId).toBe("BT24-010");
  });

  it("digivolves from a level 3 TS Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "tsBase" }],
        hand: [{ card: "BT24-010", as: "greymon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("greymon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.instanceId === s.inst("greymon").instanceId);

    expect(s.state.memory).toBe(3);
  });
});
