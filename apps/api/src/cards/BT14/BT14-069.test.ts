import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-069.js";

describe("BT14-069", () => it("inherits one memory on deletion", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "GainMemory", amount: 1 }] })));
