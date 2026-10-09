// @vitest-environment jsdom
/* One shard of the pacing budget; see budgetSuite.ts. */

import { vi } from "vitest";
import { defineBudgetSuite } from "./budgetSuite";

vi.mock("../../src/design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

defineBudgetSuite(4);
