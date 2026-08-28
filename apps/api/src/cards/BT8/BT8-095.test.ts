import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-072.js";
import { compiled } from "./BT8-095.js";

describe("BT8-095 Fire Rocket", () => {
  it("keeps the Armor Form waiver, multicolor target, and Blocker boundary in executable IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "Static",
          actions: [
            {
              kind: "WaiveColorRequirement",
              target: { isSelf: true },
              condition: {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Armor Form"], match: "trait" }] },
              },
            },
          ],
        },
        { trigger: "Main", actions: [{ kind: "GainKeyword", target: { filter: { controller: "mine", kind: ["Digimon"], multicolor: true } } }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], keywords: ["Blocker"] } } }] },
      ],
    });
  });

  it("waives its red requirement and grants Security Attack +1 to only the chosen multicolor Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-023", as: "chosen" },
            { card: "BT8-039", as: "other" },
          ],
          hand: [{ card: "BT8-095", as: "option" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack") === 1 &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-095"),
    );

    expect(observe(s.engine).keywordAmount(s.perm("chosen"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("other"), "SecurityAttack")).toBe(0);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
  });

  it("deletes only the selected opposing Blocker from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT8-095", as: "option", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-072", as: "blocker" },
            { card: "BT8-023", as: "nonBlocker" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-072"));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-072")).toBe(true);
    expect(s.perm("nonBlocker").topCard.cardId).toBe("BT8-023");
  });
});
