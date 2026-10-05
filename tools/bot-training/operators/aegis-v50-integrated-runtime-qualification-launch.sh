set -euo pipefail
source /home/vinicius/aegis-bot-lab/env.sh
export CUDA_VISIBLE_DEVICES=-1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 PYTHONDONTWRITEBYTECODE=1
lab=/home/vinicius/aegis-bot-lab
launch="$lab/runs/2026-10-05-bt26-ex13-v50-integrated-runtime-qualification-launch"
test ! -e "$launch" && test ! -L "$launch"
mkdir "$launch"
trap 'code=$?; printf "%s\n" "$code" > "$launch/exit-code.txt"' EXIT
cp "$lab/transfers/aegis-v50-integrated-runtime-qualification-launch.sh" "$launch/launch.sh"
printf '%s  %s\n' 4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c "$lab/transfers/aegis-v50-integrated-runtime-qualification.py" | sha256sum -c -
"$lab/venv/bin/python" -u "$lab/transfers/aegis-v50-integrated-runtime-qualification.py" 4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c > "$launch/launch.log" 2>&1
cat "$lab/runs/2026-10-05-bt26-ex13-v50-integrated-runtime-qualification/completion.json"
