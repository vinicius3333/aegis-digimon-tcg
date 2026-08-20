import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-043.js";

describe("BT14-043", () => it("may suspend one own Digimon to suspend an opposing Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } }, cost: { kind: "suspend", target: { filter: { controller: "mine", kind: ["Digimon"] } } } }] })));
