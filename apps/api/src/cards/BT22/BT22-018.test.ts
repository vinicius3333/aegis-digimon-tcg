import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-018.js";

describe("BT22-018 Sangomon", () => {
  it("places itself under an Aqua/Sea Animal Digimon and grants temporary protection", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions).toHaveLength(2);
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] } },
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        host: "target",
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(onPlay?.actions[1]).toMatchObject({
      kind: "GrantStatic",
      grant: "protection",
      tokens: ["beDeletedInBattle"],
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });
});
