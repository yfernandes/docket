#!/usr/bin/env bash
set -euo pipefail

DOCKET_REPO="${DOCKET_REPO:-yfernandes/docket}"
DOCKET_REF="${DOCKET_REF:-main}"
DOCKET_ARCHIVE_URL="${DOCKET_ARCHIVE_URL:-}"
DOCKET_DIR_SET="${DOCKET_DIR+x}"
DOCKET_BRANCH_SET="${DOCKET_BRANCH+x}"
DOCKET_DIR="${DOCKET_DIR:-tasks}"
DOCKET_BRANCH="${DOCKET_BRANCH:-tasks}"
DOCKET_CONFIG=""

YES=0
while [ "$#" -gt 0 ]; do
	arg="$1"
	case "$arg" in
		-y|--yes)
			YES=1
			;;
		-h|--help)
			cat <<'EOF'
Usage: setup.sh [--yes] [--dir <directory>] [--branch <branch>] [--config <path>]

Install docket into the current git repository as an orphan worktree.

Environment:
  DOCKET_REPO     GitHub repo to install from (default: yfernandes/docket)
  DOCKET_REF      Git ref to install from (default: main)
  DOCKET_ARCHIVE_URL
                 Archive URL override for tests or mirrors
  DOCKET_DIR      Worktree directory (default: tasks)
  DOCKET_BRANCH   Worktree branch name (default: tasks)
EOF
			exit 0
			;;
		--dir)
			[ "$#" -gt 1 ] || { echo "--dir requires a value" >&2; exit 2; }
			DOCKET_DIR="$2"; shift
			DOCKET_DIR_SET=1
			;;
		--branch)
			[ "$#" -gt 1 ] || { echo "--branch requires a value" >&2; exit 2; }
			DOCKET_BRANCH="$2"; shift
			DOCKET_BRANCH_SET=1
			;;
		--config)
			[ "$#" -gt 1 ] || { echo "--config requires a value" >&2; exit 2; }
			DOCKET_CONFIG="$2"; shift
			;;
		*)
			echo "Unknown argument: $arg" >&2
			exit 2
			;;
	esac
	shift
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

if [ -n "$DOCKET_CONFIG" ] && [ ! -f "$DOCKET_CONFIG" ]; then
	echo "Configuration file does not exist: $DOCKET_CONFIG" >&2
	exit 1
fi

# Setup consumes installation settings from an explicit config file after flags
# and environment. Runtime validation is performed by `task config validate`.
if [ -n "$DOCKET_CONFIG" ]; then
	config_dir="$(sed -nE 's/.*"directory"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$DOCKET_CONFIG" | head -n1)"
	config_branch="$(sed -nE 's/.*"branch"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$DOCKET_CONFIG" | head -n1)"
	[ -n "$DOCKET_DIR_SET" ] || { [ -z "$config_dir" ] || DOCKET_DIR="$config_dir"; }
	[ -n "$DOCKET_BRANCH_SET" ] || { [ -z "$config_branch" ] || DOCKET_BRANCH="$config_branch"; }
fi

if [ -e "$DOCKET_DIR" ]; then
	echo "Refusing to install: $DOCKET_DIR already exists." >&2
	echo "An existing Docket installation must be migrated deliberately; update docket.json and move its worktree with git worktree commands rather than rerunning setup." >&2
	exit 1
fi

if [ -e task ] || [ -L task ]; then
	echo "Refusing to install: ./task already exists." >&2
	echo "Changing Docket directory or branch after setup requires an explicit worktree migration; setup will not move or recreate it." >&2
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
copy_path "$tmpdir/README.md" "$DOCKET_DIR/README.md"
copy_path "$tmpdir/RULES.md" "$DOCKET_DIR/RULES.md"
copy_path "$tmpdir/SETUP.md" "$DOCKET_DIR/SETUP.md"
copy_path "$tmpdir/STRUCTURE.md" "$DOCKET_DIR/STRUCTURE.md"
copy_path "$tmpdir/flow.md" "$DOCKET_DIR/flow.md"
if [ -n "$DOCKET_CONFIG" ]; then
	copy_path "$DOCKET_CONFIG" "$DOCKET_DIR/docket.json"
elif [ -f "$tmpdir/docket.json" ]; then
	copy_path "$tmpdir/docket.json" "$DOCKET_DIR/docket.json"
fi
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
