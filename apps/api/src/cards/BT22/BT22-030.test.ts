import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-030.js";

describe("BT22-030 Musimon", () => {
  it("uses the one-or-fewer-Tamers gate and includes the linked card's attack effect", () => {
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      triggerFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          condition: { kind: "permanentCount", op: "lte", value: 1, filter: { kind: ["Tamer"] } },
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Torajiro Asuka"], match: "name" }] },
            count: 1,
          },
        },
      ],
    });
    const linkedAttack = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(linkedAttack).toMatchObject({
      isLinked: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("plays Torajiro free when this Digimon gets linked with exactly one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-030", as: "musimon" },
            { card: "BT22-083", as: "existingTamer" },
          ],
          hand: [
            { card: "BT21-009", as: "link" },
            { card: "BT22-087", as: "torajiro" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("musimon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-087"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("musimon").linked.some((card) => card.cardId === "BT21-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT22-087")).toHaveLength(
      1,
    );
  });

  it("does not play Torajiro above the Tamer boundary and allows refusal", async () => {
    for (const scenario of ["tooManyTamers", "refused"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT22-030", as: "musimon" },
              ...(scenario === "tooManyTamers"
                ? [
                    { card: "BT22-083", as: "firstTamer" },
                    { card: "BT22-085", as: "secondTamer" },
                  ]
                : []),
            ],
            hand: [{ card: "BT22-087", as: "torajiro" }],
          },
        },
        { autoAcceptOptional: scenario !== "refused", autoSelectCards: true },
      );
      await s.ready();

      const resolution = advance(s.engine).fireSubTrigger("whenLinked", {
        subjectPermanentId: s.perm("musimon").permanentId,
      });
      if (scenario === "refused") {
        await settle(() => s.state.pendingDecision?.kind === "optional");
        expect(
          s.engine.applyIntent(0, {
            type: "respondDecision",
            decisionId: s.state.pendingDecision!.decisionId,
            response: { kind: "optional", accept: false },
          }),
        ).toEqual({ ok: true });
      }
      await resolution;

      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("torajiro").instanceId]);
    }
  });

  it("only reacts for its own stack, on its controller's turn, and once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-030", as: "musimon" },
            { card: "BT22-032", as: "other" },
          ],
          hand: [
            { card: "BT22-087", as: "firstTorajiro" },
            { card: "P-218", as: "secondTorajiro" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(2);

    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("musimon").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(2);

    s.state.turnSeat = 0;
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("musimon").permanentId });
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("musimon").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("applies the linked attack debuff once per turn from a realistic host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-032", linked: [{ card: "BT22-030", as: "musimon" }], as: "host" }] },
        1: {
          battleArea: [
            { card: "BT22-024", as: "firstTarget" },
            { card: "BT22-024", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const firstDP = s.perm("firstTarget").currentDP;
    const secondDP = s.perm("secondTarget").currentDP;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();

    expect(s.perm("firstTarget").currentDP).toBe(firstDP - 2000);
    expect(s.perm("secondTarget").currentDP).toBe(secondDP);
  });
});
