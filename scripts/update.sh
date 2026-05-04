#!/usr/bin/env bash
set -euo pipefail

DOCKET_REPO="${DOCKET_REPO:-yfernandes/docket}"
DOCKET_REF="${DOCKET_REF:-main}"
DOCKET_ARCHIVE_URL="${DOCKET_ARCHIVE_URL:-}"
DOCKET_DIR="${DOCKET_DIR:-}"

YES=0
for arg in "$@"; do
  case "$arg" in
  -y | --yes)
    YES=1
    ;;
  -h | --help)
    cat <<'EOF'
Usage: update.sh [--yes]

Update an existing docket install. This overwrites only distro-managed files:
  task
  task.ts
  README.md
  RULES.md
  SETUP.md
  STRUCTURE.md
  skills/
  issues/templates/
  scripts/

It does not overwrite flow.md, assignments.yaml, live issues, backlog files, or
done archives.

Environment:
  DOCKET_REPO   GitHub repo to update from (default: yagoalmeida/docket)
  DOCKET_REF    Git ref to update from (default: main)
  DOCKET_ARCHIVE_URL
               Archive URL override for tests or mirrors
  DOCKET_DIR    Docket directory override (default: resolve from ./task or cwd)
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
  y | Y | yes | YES) ;;
  *)
    echo "Aborted." >&2
    exit 1
    ;;
  esac
}

resolve_docket_dir() {
  if [ -n "$DOCKET_DIR" ]; then
    printf "%s\n" "$DOCKET_DIR"
    return
  fi
  if [ -L task ]; then
    target="$(readlink task)"
    case "$target" in
    /*) dirname "$target" ;;
    *) dirname "$(pwd)/$target" ;;
    esac
    return
  fi
  if [ -f task ] && [ -d skills ] && [ -d issues/templates ]; then
    printf "%s\n" "."
    return
  fi
  if [ -f tasks/task ]; then
    printf "%s\n" "tasks"
    return
  fi
  echo "Could not find docket. Run from the repo root or set DOCKET_DIR." >&2
  exit 1
}

need git
need curl
need tar

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -n "$repo_root" ]; then
  cd "$repo_root"
fi

docket_dir="$(resolve_docket_dir)"
if [ ! -d "$docket_dir" ]; then
  echo "Docket directory does not exist: $docket_dir" >&2
  exit 1
fi

if ! git -C "$docket_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Docket directory is not a git worktree: $docket_dir" >&2
  exit 1
fi

cat >&2 <<EOF
WARNING: this update may overwrite local changes to distro-managed docket files:
  $docket_dir/task
  $docket_dir/task.ts
  $docket_dir/README.md
  $docket_dir/RULES.md
  $docket_dir/SETUP.md
  $docket_dir/STRUCTURE.md
  $docket_dir/skills/
  $docket_dir/issues/templates/
  $docket_dir/scripts/

It will not overwrite:
  $docket_dir/flow.md
  $docket_dir/assignments.yaml
  $docket_dir/issues/<scope>/
EOF

confirm "Continue with docket update?"

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

copy_file() {
  src="$1"
  dst="$2"
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

merge_dir() {
  src="$1"
  dst="$2"
  mkdir -p "$dst"
  cp -R "$src/." "$dst/"
}

copy_file "$tmpdir/task" "$docket_dir/task"
copy_file "$tmpdir/task.ts" "$docket_dir/task.ts"
copy_file "$tmpdir/README.md" "$docket_dir/README.md"
copy_file "$tmpdir/RULES.md" "$docket_dir/RULES.md"
copy_file "$tmpdir/SETUP.md" "$docket_dir/SETUP.md"
copy_file "$tmpdir/STRUCTURE.md" "$docket_dir/STRUCTURE.md"
merge_dir "$tmpdir/skills" "$docket_dir/skills"
merge_dir "$tmpdir/scripts" "$docket_dir/scripts"
mkdir -p "$docket_dir/issues"
merge_dir "$tmpdir/issues/templates" "$docket_dir/issues/templates"
chmod +x "$docket_dir/task"
chmod +x "$docket_dir/scripts/setup.sh" "$docket_dir/scripts/update.sh"

stage_paths=(
  task
  task.ts
  README.md
  RULES.md
  SETUP.md
  STRUCTURE.md
)

while IFS= read -r -d '' file; do
  stage_paths+=("${file#"$tmpdir/"}")
done < <(find "$tmpdir/skills" "$tmpdir/issues/templates" "$tmpdir/scripts" -type f -print0)

git -C "$docket_dir" add -f -- "${stage_paths[@]}"

if git -C "$docket_dir" diff --cached --quiet; then
  echo "Docket is already up to date."
else
  git -C "$docket_dir" commit -m "chore: update docket"
  echo "Updated docket."
fi

echo "Verification:"
if [ -x "$docket_dir/task" ]; then
  "$docket_dir/task" lint || true
  "$docket_dir/task" doctor || true
fi
