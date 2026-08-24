import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-056.js";
import "../index.js";

describe("BT26-056 Cerberusmon: Werewolf Mode", () => {
  it("encodes the three keywords, Dark Animal rule trait, deletion play, TS waiver, and empty-hand-safe De-Digivolve Main", () => {
    expect(digivolutionRequirementsFor("BT26-056")).toEqual(
      expect.arrayContaining([
        { names: ["Cerberusmon"], cost: 1, isAlternate: true },
        { level: 4, traits: ["TS"], cost: 3, isAlternate: true },
      ]),
    );
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Jamming" }),
        expect.objectContaining({ keyword: "Reboot" }),
        expect.objectContaining({ keyword: "Blocker" }),
      ]),
    );
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false }],
    });
    expect(compiled.effects?.[2]?.actions).toContainEqual(expect.objectContaining({ kind: "WaiveColorRequirement" }));
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Trash" }, { kind: "DeDigivolve", amount: 3 }],
    });
  });

  it("publicly plays a level 4-or-lower Titan from the trash when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-056", as: "werewolf" }],
          trash: [{ card: "BT26-021", as: "titan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("werewolf").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-021");
  });

  it("uses Inferno Divide by mandatorily trashing a hand card before De-Digivolve 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-071", as: "ts" }],
          hand: [
            { card: "BT26-056", as: "infernoDivide" },
            { card: "BT1-001", as: "handTrash" },
          ],
        },
        1: { battleArea: [{ card: "BT26-060", as: "target", under: ["BT26-059", "BT26-058", "BT26-057"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("infernoDivide").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
