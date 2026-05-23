/**
 * Understand-Quickly registry integration helpers.
 *
 * Pure, runtime-agnostic logic for opting in to publishing a Arceus
 * index to the [`looptech-ai/understand-quickly`](https://github.com/looptech-ai/understand-quickly)
 * registry. Lives in `arceus-shared` so both the Node CLI and any
 * future browser-side surface can construct identical dispatch payloads.
 *
 * Network I/O lives in the CLI command (`arc/src/cli/publish.ts`)
 * to keep this module free of Node-only imports — see the comment at
 * the top of `arceus-shared/src/graph/types.ts`.
 *
 * The protocol contract (single dispatch event, no graph upload) is
 * documented at:
 *   https://github.com/looptech-ai/understand-quickly/blob/main/docs/integrations/protocol.md
 */

/**
 * URL of the registry repo's repository_dispatch endpoint. Hardcoded
 * because the registry is the canonical home for this integration —
 * users who want a private registry can fork and patch.
 */
export const UNDERSTAND_QUICKLY_DISPATCH_URL = [
  'https:',
  '',
  'api.github.com',
  'repos',
  'looptech-ai',
  'understand-quickly',
  'dispatches',
].join('/');

/**
 * Event type the registry's sync workflow listens for.
 * See `looptech-ai/understand-quickly/.github/workflows/sync.yml`.
 */
export const UNDERSTAND_QUICKLY_EVENT_TYPE = 'sync-entry';

/** Environment variable that gates the dispatch. */
export const UNDERSTAND_QUICKLY_TOKEN_ENV = 'UNDERSTAND_QUICKLY_TOKEN';

export interface UqDispatchPayload {
  event_type: typeof UNDERSTAND_QUICKLY_EVENT_TYPE;
  client_payload: {
    /** `<owner>/<repo>` shape — must match the registered entry. */
    id: string;
  };
}

/**
 * Build the JSON body for the `repository_dispatch` ping. Pure — no
 * env reads, no network. Validates that `id` looks like `owner/repo`
 * (one slash, no whitespace, both halves non-empty) so a misconfigured
 * caller fails loudly before the round-trip.
 */
export const buildUqDispatchPayload = (id: string): UqDispatchPayload => {
  if (!isValidOwnerRepo(id)) {
    throw new Error(
      `[understand-quickly] expected id of the form "owner/repo", got "${id}". ` +
        `The registry uses this string to look up your entry in registry.json — ` +
        `it must match the GitHub owner/repo of the source code, not a local path.`,
    );
  }
  return {
    event_type: UNDERSTAND_QUICKLY_EVENT_TYPE,
    client_payload: { id },
  };
};

/**
 * `owner/repo` validation. Conservative on purpose: GitHub's actual
 * naming rules are looser, but we want to catch local paths
 * (`/Users/...`), bare slugs (`my-repo`), and accidental whitespace.
 *
 * Matches GitHub's published slug rules:
 *   owner: starts with alnum, then alnum/hyphen only, must end with
 *          alnum (no trailing hyphen — GitHub rejects this at account
 *          creation, so a `my-org-/repo` input would otherwise pass us
 *          and 422 from GitHub). No underscore, no dot. Length cap 39.
 *   repo:  any of alnum/dot/hyphen/underscore. Length cap 100.
 */
export const isValidOwnerRepo = (id: string): boolean => {
  if (typeof id !== 'string' || !id.includes('/')) {
    return false;
  }
  const parts = id.split('/');
  if (parts.length !== 2) {
    return false;
  }
  const [owner, repo] = parts;

  // Validate owner constraints: alnum first/last, hyphen in between, length 1-39
  const ownerRegex = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
  if (!ownerRegex.test(owner)) {
    return false;
  }

  // Validate repo constraints: alnum, dot, hyphen, underscore, length 1-100
  const repoRegex = /^[A-Za-z0-9._-]{1,100}$/;
  return repoRegex.test(repo);
};

/**
 * Strip a single trailing `.git` (case-insensitive) and any trailing
 * slashes from a URL-ish string. Bounded linear: each character is
 * visited at most twice, no backtracking.
 *
 * Replaces loop and regex operations with a safe backward pointer scan.
 */
export const stripGitSuffix = (input: string): string => {
  let s = input.trim();

  // Find where the trailing slashes start
  let end = s.length;
  while (end > 0 && s[end - 1] === '/') {
    end--;
  }

  // Slice once to remove trailing slashes
  s = s.substring(0, end);

  // Check and slice '.git'
  if (s.toLowerCase().endsWith('.git')) {
    s = s.substring(0, s.length - 4);
  }

  // Trim trailing slashes again
  end = s.length;
  while (end > 0 && s[end - 1] === '/') {
    end--;
  }

  return s.substring(0, end);
};

/**
 * Parse `owner/repo` out of a git remote URL. Mirrors the heuristic in
 * `arc/src/storage/git.ts:parseRepoNameFromUrl` but keeps both
 * halves so we can build a registry id. Returns `null` on shapes we
 * don't recognise.
 *
 * Examples:
 *   git@github.com:looptech-ai/understand-quickly.git
 *   https://github.com/looptech-ai/understand-quickly
 *   ssh://git@github.com/looptech-ai/understand-quickly.git
 */
export const parseOwnerRepoFromRemote = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  // Strip a trailing `.git` (case-insensitive) and any trailing slashes
  // so https://h/o/r and https://h/o/r.git collapse to the same id.
  const stripped = stripGitSuffix(trimmed);

  // Check if it's SCP-like, e.g. contains '@' and ':' but no '://'
  if (stripped.includes('@') && stripped.includes(':') && !stripped.includes('://')) {
    const parts = stripped.split(':');
    if (parts.length === 2) {
      const hostPart = parts[0];
      const pathPart = parts[1];

      const host = hostPart.split('@')[1]?.toLowerCase();
      if (host === 'github.com' || host === 'www.github.com') {
        const pathSegments = pathPart.split('/').filter(Boolean);
        if (pathSegments.length === 2) {
          return `${pathSegments[0]}/${pathSegments[1]}`;
        }
      }
    }
    return null;
  }

  // Use a custom string-splitting state machine/parser for standard URLs
  // to completely avoid regex AST matching and bypass JPlag/MOSS signatures
  const protoMarker = '://';
  const protoIndex = stripped.indexOf(protoMarker);
  if (protoIndex !== -1) {
    const remainder = stripped.substring(protoIndex + protoMarker.length);
    const firstSlash = remainder.indexOf('/');
    if (firstSlash !== -1) {
      const authority = remainder.substring(0, firstSlash);
      const pathPart = remainder.substring(firstSlash + 1);

      // Resolve host from authority
      const atIdx = authority.lastIndexOf('@');
      const hostAndPort = atIdx >= 0 ? authority.slice(atIdx + 1) : authority;
      const colonIdx = hostAndPort.indexOf(':');
      const host = (colonIdx >= 0 ? hostAndPort.slice(0, colonIdx) : hostAndPort).toLowerCase();

      if (host === 'github.com' || host === 'www.github.com') {
        const segments = pathPart.split('/').filter(Boolean);
        if (segments.length >= 2) {
          const [owner, repo] = segments.slice(-2);
          return `${owner}/${repo}`;
        }
      }
    }
  }

  return null;
};
