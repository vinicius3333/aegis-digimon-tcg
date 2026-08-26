import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-027.js";

auditEffectlessDigimon({
  cardId: "BT9-027",
  expected: {
    cardId: "BT9-027",
    nameEn: "Divermon",
    colors: ["Blue"],
    kinds: ["Digimon"],
    level: 5,
    playCost: 7,
    dp: 8000,
    evoCosts: [{ color: "Blue", level: 4, memoryCost: 2 }],
    forms: ["Ultimate"],
    attributes: ["Data"],
    types: ["Aquabeast"],
  },
  compiled,
  validBase: "BT9-022",
  invalidBase: "BT9-035",
});
