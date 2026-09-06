import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT25-052.js";

describe("BT25-052 Logimon", () => {
  it("links an eligible Appmon from hand and plays Kazuki & Itsuki when linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-052", as: "logimon" }],
          hand: [
            { card: "BT25-036", as: "link" },
            { card: "BT25-089", as: "kazuki" },
          ],
        },
        1: { battleArea: [{ card: "BT25-046", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("logimon")) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("logimon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("logimon").linked.some((card) => card.instanceId === s.inst("link").instanceId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-089")).toBe(true);
  });

  it("links an eligible card from its own digivolution cards and rejects a non-Link card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-052", as: "logimon", under: [{ card: "BT25-007", as: "stackLink" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("logimon")) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("logimon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("logimon").linked.length === 1);
    expect(s.perm("logimon").linked.map((card) => card.cardId)).toEqual(["BT25-007"]);
    expect(s.perm("logimon").stack).toHaveLength(0);

    const refused = setupEngine(
      { 0: { battleArea: [{ card: "BT25-052", as: "logimon" }], hand: [{ card: "BT1-009", as: "notLink" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await refused.ready();
    const [refusedEffect] = observe(refused.engine).activatableEffects(refused.perm("logimon")) as {
      effectKey: string;
    }[];
    expect(
      refused.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: refused.perm("logimon").topCard.instanceId,
        effectKey: refusedEffect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(refused.state.players[0]!.hand.map((card) => card.instanceId)).toContain(refused.inst("notLink").instanceId);
  });

  it("supports refusal of the optional Main link cost without changing zones", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-052", as: "logimon" }], hand: [{ card: "BT25-036", as: "link" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const [effect] = observe(s.engine).activatableEffects(s.perm("logimon")) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("logimon").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("logimon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
  });

  it("does not play Kazuki & Itsuki when its controller has 2 Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-052", as: "logimon" },
            { card: "BT1-089", as: "tamer1" },
            { card: "BT1-089", as: "tamer2" },
          ],
          hand: [
            { card: "BT25-061", as: "link" },
            { card: "BT25-089", as: "kazuki" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { linkedInstanceIds: [s.inst("link").instanceId] });

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("kazuki").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "BT25-089")).toHaveLength(0);
  });

  it("keeps the App Fusion requirement and once-per-turn link timing", () => {
    const card = runtimeCompiledCard("BT25-052");
    expect(card).toMatchObject({ appFusionRequirement: [{ names: ["Onmon", "Gatchmon"], cost: 0 }] });
    expect(card?.effects.some((effect) => effect.trigger === "Main" && effect.frequency === "OncePerTurn")).toBe(true);
  });

  it("preserves the Appmon Link requirement and suspends an opposing Digimon or Tamer when linking", async () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenLinking",
        isLinked: true,
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          },
        ],
      }),
    );

    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: "BT25-052", as: "logimon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "digimon" },
            { card: "BT1-089", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("tamer").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("logimon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").isSuspended);

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").linked[0]?.instanceId).toBe(s.inst("logimon").instanceId);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("digimon").isSuspended).toBe(false);
  });

  it("binds its Main link recipient and its when-linked watcher to this Logimon", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({
      kind: "Link",
      target: { filter: { hasLinkRequirement: true }, source: "thisDigimon" },
      from: ["hand", "digivolutionCards"],
      costDelta: -1,
      optional: true,
    });

    const linked = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(linked?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      on: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    });
  });

  it("App Fuses the printed Onmon and Gatchmon pair at zero cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-045", as: "onmon", linked: [{ card: "BT21-009", as: "gatchmon" }] }],
        hand: [{ card: "BT25-052", as: "logimon" }],
        deck: ["BT1-010"],
      },
    });
    await s.ready();
    const fused = await advance(s.engine).verb.appFuseInto(s.perm("onmon").permanentId, s.inst("logimon").instanceId);
    expect(fused?.topCard.cardId).toBe("BT25-052");
    expect(fused?.stack.map((card) => card.cardId)).toEqual(["BT25-045", "BT21-009"]);
    expect(s.perm("onmon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-010");
  });
});
