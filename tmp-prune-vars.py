import re
import subprocess
import sys

p = sys.argv[1]

for _ in range(8):
    out = subprocess.run(["pnpm", "lint:files", p], capture_output=True, text=True).stdout
    names = set(re.findall(r"Variable '([^']+)' is declared but never used", out))
    if not names:
        print("clean")
        break
    lines = open(p).read().split("\n")
    kept = [line for line in lines if line.strip().rstrip(",") not in names]
    open(p, "w").write("\n".join(kept))
else:
    print("gave up")
