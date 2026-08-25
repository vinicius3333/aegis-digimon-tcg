process.env.AUDIT_SET = "AD1";
process.env.AUDIT_COUNT = "25";

await import("./generate-st23-audit-ledger.mjs");
