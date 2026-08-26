import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-053.js";

auditEffectlessDigimon({
  cardId: "BT9-053",
  expected: {
    cardId: "BT9-053",
    nameEn: "Zamielmon",
    colors: ["Green"],
    kinds: ["Digimon"],
    level: 5,
    playCost: 8,
    dp: 9000,
    evoCosts: [{ color: "Green", level: 4, memoryCost: 2 }],
    forms: ["Ultimate"],
    attributes: ["Data"],
    types: ["Wizard", "Big Death-Stars"],
  },
  compiled,
  validBase: "BT9-048",
  invalidBase: "BT9-022",
});
