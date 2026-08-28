import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-042.js";

describe("BT9-042 Raijinmon", () => {
  it("matches catalog and complete hand, evolution, and inherited IR contract", () => {
    expect(getCardDefinition("BT9-042")).toMatchObject({
      cardId: "BT9-042", nameEn: "Raijinmon", colors: ["Yellow", "Black"], kinds: ["Digimon"], level: 6,
      playCost: 11, dp: 11000,
      evoCosts: [{ color: "Yellow", level: 5, memoryCost: 3 }, { color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"], attributes: ["Virus"], types: ["Cyborg"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Hand", actions: [{ kind: "PlaceUnder", position: "bottom", cost: { kind: "payMemory", memory: 1 }, optional: true }] },
        { trigger: "WhenDigivolving", actions: [{ kind: "Trash", optional: true, abortOnDecline: true }, { kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }] },
        { trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }] },
      ],
    });
  });

  it("trashes a Machine or Cyborg to give an opposing Digimon -4000 DP when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-060", as: "base" }],
          hand: [
            { card: "BT9-042", as: "evolving" },
            { card: "BT1-021", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("activates its Hand effect only after paying 1 memory and places itself under Raidenmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-067", as: "raidenmon" }],
          hand: [{ card: "BT9-042", as: "raijinmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("raijinmon").instanceId,
        effectKey: "BT9-042/ir-27-0",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("raidenmon").stack.some((card) => card.instanceId === s.inst("raijinmon").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("raidenmon").stack.at(-1)?.instanceId).toBe(s.inst("raijinmon").instanceId);
  });
});
