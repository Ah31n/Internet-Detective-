#!/usr/bin/env bash
#
# Pushes this project to GitHub.
#
# Written because the sandbox this was built in has no GitHub credentials and
# no network access, so the push has to happen from your machine.
#
# It is safe to run more than once, and safe to run whether or not the .git
# directory survived the trip — it repairs an incomplete repository rather than
# failing on one.
#
#   ./tools/push_to_github.sh <your-github-username> [repo-name]
#
# Example:
#   ./tools/push_to_github.sh janedoe Internet-Detective-
#
# Authenticate first, either with the GitHub CLI (`gh auth login`) or by using
# a personal access token as the password when git prompts you.

set -euo pipefail

USERNAME="${1:-}"
REPO="${2:-Internet-Detective-}"

if [[ -z "$USERNAME" ]]; then
  echo "usage: $0 <your-github-username> [repo-name]" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

REMOTE_URL="https://github.com/${USERNAME}/${REPO}.git"

# A repository whose config was stripped reports itself as no repository at
# all. Re-initialising is harmless: existing objects are kept.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Initialising repository…"
  git init -b main
fi

# Only set an identity if the machine has none, so a real one is never
# overwritten.
if ! git config user.email >/dev/null 2>&1; then
  git config user.name "Internet Detective"
  git config user.email "dev@internetdetective.game"
fi

git add -A

if git diff --cached --quiet && git rev-parse HEAD >/dev/null 2>&1; then
  echo "Nothing new to commit."
else
  git commit -m "INTERNET DETECTIVE — premium offline mobile detective game"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

git branch -M main

echo
echo "Pushing to ${REMOTE_URL}"
echo "Create the repository first if it does not exist:"
echo "  gh repo create ${USERNAME}/${REPO} --private --source=. --remote=origin"
echo

git push -u origin main
