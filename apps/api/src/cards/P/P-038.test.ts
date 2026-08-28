import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import "./P-038.js";

// audit-cases: 4
memoryBoostTests({
  cardId: "P-038",
  name: "Green Memory Boost!",
  colorSource: "BT1-064",
  matchingDigimon: "BT1-064",
  offColorDigimon: "BT1-009",
});
