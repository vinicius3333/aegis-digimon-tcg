import re
import subprocess
import sys

p = sys.argv[1] if len(sys.argv) > 1 else "apps/web/src/game/GameScreen.tsx"

for _ in range(8):
    out = subprocess.run(["pnpm", "lint:files", p], capture_output=True, text=True).stdout
    names = set(re.findall(r"(?:Identifier|Type) '([^']+)' is imported but never used", out))
    if not names:
        print("clean")
        break
    text = open(p).read()
    lines = text.split("\n")
    kept = []
    for line in lines:
        stripped = line.strip().rstrip(",")
        m = re.match(r'^import (?:type )?\{ ([A-Za-z0-9_, ]+) \} from "[^"]+";$', stripped)
        if m and all(b.strip().removeprefix("type ").strip() in names for b in m.group(1).split(",")):
            continue
        kept.append(line)
    text = "\n".join(kept)

    def prune(match):
        head, body, tail = match.group(1), match.group(2), match.group(3)
        members = [m for m in body.split("\n") if m.strip()]
        left = [m for m in members if m.strip().rstrip(",").removeprefix("type ").strip() not in names]
        if not left:
            return ""
        return head + "\n".join(left) + "\n" + tail

    text = re.sub(r'(import (?:type )?\{\n)((?:.*\n)*?)(\} from "[^"]+";\n)', prune, text)
    # Single-line imports with a dead member among live ones.
    def prune_inline(match):
        head, body, tail = match.group(1), match.group(2), match.group(3)
        left = [b.strip() for b in body.split(",") if b.strip().removeprefix("type ").strip() not in names]
        if not left:
            return ""
        return head + ", ".join(left) + tail

    text = re.sub(r'(import (?:type )?\{ )([^}\n]+)( \} from "[^"]+";\n)', prune_inline, text)
    open(p, "w").write(text)
else:
    print("gave up")
