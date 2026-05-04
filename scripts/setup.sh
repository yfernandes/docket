#!/usr/bin/env bash
set -euo pipefail

DOCKET_REPO="${DOCKET_REPO:-yagoalmeida/docket}"
DOCKET_REF="${DOCKET_REF:-main}"
DOCKET_ARCHIVE_URL="${DOCKET_ARCHIVE_URL:-}"
DOCKET_DIR="${DOCKET_DIR:-tasks}"
DOCKET_BRANCH="${DOCKET_BRANCH:-tasks}"

YES=0
for arg in "$@"; do
	case "$arg" in
		-y|--yes)
			YES=1
			;;
		-h|--help)
			cat <<'EOF'
Usage: setup.sh [--yes]

Install docket into the current git repository as an orphan worktree.

Environment:
  DOCKET_REPO     GitHub repo to install from (default: yagoalmeida/docket)
  DOCKET_REF      Git ref to install from (default: main)
  DOCKET_ARCHIVE_URL
                 Archive URL override for tests or mirrors
  DOCKET_DIR      Worktree directory (default: tasks)
  DOCKET_BRANCH   Worktree branch name (default: tasks)
EOF
			exit 0
			;;
		*)
			echo "Unknown argument: $arg" >&2
			exit 2
			;;
	esac
done

need() {
	if ! command -v "$1" >/dev/null 2>&1; then
		echo "Missing required command: $1" >&2
		exit 1
	fi
}

confirm() {
	if [ "$YES" -eq 1 ]; then
		return 0
	fi
	if [ ! -r /dev/tty ]; then
		echo "Refusing to continue without a TTY. Re-run with --yes to confirm." >&2
		exit 1
	fi
	printf "%s [y/N] " "$1" >/dev/tty
	read -r answer </dev/tty
	case "$answer" in
		y|Y|yes|YES) ;;
		*) echo "Aborted." >&2; exit 1 ;;
	esac
}

need git
need curl
need tar

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$repo_root" ]; then
	echo "Run this from inside the git repository that should receive docket." >&2
	exit 1
fi
cd "$repo_root"

if [ -e "$DOCKET_DIR" ]; then
	echo "Refusing to install: $DOCKET_DIR already exists." >&2
	echo "Use scripts/update.sh for existing docket installs." >&2
	exit 1
fi

if [ -e task ] || [ -L task ]; then
	echo "Refusing to install: ./task already exists." >&2
	exit 1
fi

confirm "Install docket into ./$DOCKET_DIR, create ./task symlink, and append $DOCKET_DIR/ to .gitignore?"

tmpdir="$(mktemp -d)"
cleanup() {
	rm -rf "$tmpdir"
}
trap cleanup EXIT

archive_url="$DOCKET_ARCHIVE_URL"
if [ -z "$archive_url" ]; then
	archive_url="https://github.com/$DOCKET_REPO/archive/$DOCKET_REF.tar.gz"
fi
echo "Downloading $archive_url"
curl -fsSL "$archive_url" | tar -xz -C "$tmpdir" --strip-components=1

echo "Creating orphan worktree $DOCKET_DIR on branch $DOCKET_BRANCH"
git worktree add --orphan -b "$DOCKET_BRANCH" "$DOCKET_DIR"

copy_path() {
	src="$1"
	dst="$2"
	mkdir -p "$(dirname "$dst")"
	cp -R "$src" "$dst"
}

copy_path "$tmpdir/task" "$DOCKET_DIR/task"
copy_path "$tmpdir/task.ts" "$DOCKET_DIR/task.ts"
copy_path "$tmpdir/README.md" "$DOCKET_DIR/README.md"
copy_path "$tmpdir/RULES.md" "$DOCKET_DIR/RULES.md"
copy_path "$tmpdir/SETUP.md" "$DOCKET_DIR/SETUP.md"
copy_path "$tmpdir/STRUCTURE.md" "$DOCKET_DIR/STRUCTURE.md"
copy_path "$tmpdir/flow.md" "$DOCKET_DIR/flow.md"
copy_path "$tmpdir/skills" "$DOCKET_DIR/skills"
copy_path "$tmpdir/scripts" "$DOCKET_DIR/scripts"
mkdir -p "$DOCKET_DIR/issues"
copy_path "$tmpdir/issues/templates" "$DOCKET_DIR/issues/templates"

chmod +x "$DOCKET_DIR/task"
chmod +x "$DOCKET_DIR/scripts/setup.sh" "$DOCKET_DIR/scripts/update.sh"
ln -s "$DOCKET_DIR/task" task

if ! grep -qxF "$DOCKET_DIR/" .gitignore 2>/dev/null; then
	printf "\n%s/\n" "$DOCKET_DIR" >> .gitignore
fi

git -C "$DOCKET_DIR" add -A
git -C "$DOCKET_DIR" commit -m "init: docket task system"

echo "Installed docket."
echo "Next steps:"
echo "  ./task lint"
echo "  ./task list"
