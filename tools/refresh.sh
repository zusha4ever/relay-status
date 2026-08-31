#!/bin/zsh
set -e
cd ~/HA-Platfrom-Build/relay-worker/STELL-Finance
git fetch -q origin main && git checkout -q main && git pull -q origin main
cd ~/HA-Platfrom-Build/relay-status
git pull -q origin main || true
python3 tools/gen_windows.py >/dev/null
if ! git diff --quiet windows.json; then
  git add windows.json
  git commit -qm "board: refresh windows.json (auto, every 30 min)"
  git -c credential.helper= -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -q origin main
fi
