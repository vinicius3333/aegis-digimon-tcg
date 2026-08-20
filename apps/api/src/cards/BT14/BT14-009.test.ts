import { describe, expect, it } from "vitest";

import { compiled } from "./BT14-009.js";

describe("BT14-009", () => it("restricts both players from playing Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "RestrictPlay", seat: "any", mode: "play", filter: { kind: ["Digimon"] }, duration: "permanent" }] })));
