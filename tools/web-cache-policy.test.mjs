import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const caddyfileUrl = new URL("../docker/Caddyfile", import.meta.url);
const routerTemplateUrl = new URL("../deploy/Caddyfile.router.template", import.meta.url);
const deployControllerUrl = new URL("./blue-green-deploy.mjs", import.meta.url);

test("web Caddy keeps HTML fresh and hashed assets immutable", async () => {
  const caddyfile = await readFile(caddyfileUrl, "utf8");

  assert.match(caddyfile, /@html path \/ \/index\.html/);
  assert.match(caddyfile, /Cache-Control "no-store, no-cache, must-revalidate, max-age=0"/);
  assert.match(caddyfile, /Pragma "no-cache"/);
  assert.match(caddyfile, /Expires "0"/);
  assert.ok(
    caddyfile.includes(
      String.raw`@versioned_assets path_regexp versioned_assets /assets/.+-[A-Za-z0-9_-]+\.[A-Za-z0-9]+$`,
    ),
  );
  assert.match(caddyfile, /Cache-Control "public, max-age=31536000, immutable"/);
  assert.match(caddyfile, /handle \/reset-web-cache/);
  assert.match(caddyfile, /Clear-Site-Data "\\\"cache\\\""/);
  assert.match(caddyfile, /redir \* \/ 303/);
});

test("deployment manifest automatically refreshes a stale web revision once", async () => {
  const [template, controller] = await Promise.all([
    readFile(routerTemplateUrl, "utf8"),
    readFile(deployControllerUrl, "utf8"),
  ]);

  assert.match(template, /aegis_web_revision=\{\{ACTIVE_REVISION\}\}/);
  assert.match(template, /not header X-Aegis-Web-Revision \{\{ACTIVE_REVISION\}\}/);
  assert.match(template, /Clear-Site-Data "\\\"cache\\\""/);
  assert.doesNotMatch(template, /executionContexts/);
  assert.match(template, /Set-Cookie "aegis_web_revision=\{\{ACTIVE_REVISION\}\}/);
  assert.match(controller, /replaceAll\("\{\{ACTIVE_REVISION\}\}", state\.active\.revision\)/);
});

test("router keeps the legacy bot join endpoint compatible with the active API", async () => {
  const [template, controller] = await Promise.all([
    readFile(routerTemplateUrl, "utf8"),
    readFile(deployControllerUrl, "utf8"),
  ]);

  assert.match(
    template,
    /@legacy_bot_join \{\s*method POST\s*path \/bot\/join\s*\}/,
  );
  assert.match(
    template,
    /reverse_proxy aegis-api-\{\{ACTIVE_SLOT\}\}:2567 \{[\s\S]*\{\{LEGACY_BOT_FALLBACK\}\}/,
  );
  assert.match(template, /request_buffers 64KB/);
  assert.ok(template.indexOf("handle @legacy_bot_join") < template.indexOf("handle @legacy_gameplay"));
  assert.match(controller, /legacyBotFallback = state\.draining/);
  assert.match(controller, /aegis-api-\$\{state\.draining\.slot\}:2567/);
  assert.match(controller, /replaceAll\("\{\{LEGACY_BOT_FALLBACK\}\}", legacyBotFallback\)/);
});
