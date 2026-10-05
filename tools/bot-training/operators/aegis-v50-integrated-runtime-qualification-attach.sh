set -euo pipefail
lab=/home/vinicius/aegis-bot-lab
identity="$lab/transfers/aegis-v50-integrated-runtime-qualification-launch-identity.json"
test ! -e "$identity" && test ! -L "$identity"
printf '%s  %s\n' 5ac52bca9e66d432775a1bb1868131f5110ba53687a9b8c866a84b60efc49a9e "$lab/transfers/aegis-v50-integrated-runtime-qualification-launch.sh" | sha256sum -c -
bash "$lab/transfers/aegis-v50-integrated-runtime-qualification-launch.sh" &
whole_pid=$!
PYTHONDONTWRITEBYTECODE=1 "$lab/venv/bin/python" - "$whole_pid" <<'PYID'
import json, sys
from pathlib import Path
pid = int(sys.argv[1])
stat = Path(f'/proc/{pid}/stat')
assert pid > 0 and stat.exists()
text = stat.read_text(encoding='utf-8')
fields = text[text.rindex(')') + 2:].split()
assert fields[0] != 'Z' and fields[19].isdigit()
args = (stat.parent / 'cmdline').read_bytes().split(b'\0')
assert args[:2] == [b'bash', b'/home/vinicius/aegis-bot-lab/transfers/aegis-v50-integrated-runtime-qualification-launch.sh']
receipt = {'wholeWrapperPid': pid, 'startTicks': fields[19], 'run': '2026-10-05-bt26-ex13-v50-integrated-runtime-qualification', 'operatorSha256': '4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c', 'wrapperSha256': '5ac52bca9e66d432775a1bb1868131f5110ba53687a9b8c866a84b60efc49a9e'}
identity = Path('/home/vinicius/aegis-bot-lab/transfers/aegis-v50-integrated-runtime-qualification-launch-identity.json')
with identity.open('x', encoding='utf-8') as stream:
    stream.write(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt), flush=True)
PYID
wait "$whole_pid"
