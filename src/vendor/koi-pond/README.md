# Vendored koi

The koi themselves — anatomy, skin, pattern and swimming brain — copied from
the [hyperfrontend](https://www.hyperfrontend.dev/demos/#koi-pond) koi pond
demo, at `apps/demos/koi-pond/lib/src`.

These are the real fish, not a lookalike: the same sculpted mesh, the same
GLSL skin and deform shaders, the same nishikigoi varieties and the same
motion. Branchify only chooses who is swimming and what colour they wear.

## What was changed

Nothing, except the import specifier. Every file here is byte-identical to
upstream apart from `@hyperfrontend/random-generator-utils` being pointed at
`random-generator.ts` beside them, so re-syncing is a copy plus that one
rewrite.

`random-generator.ts` is not upstream. It reproduces the three functions the
koi actually use, because the real package reaches for another internal
library for its built-in wrappers. Its output is verified bit-for-bit against
upstream — a koi's whole body and pattern are drawn from that stream, so a
generator that merely behaved similarly would give a pond of different fish.

These files are excluded from Branchify's formatter, linter and coverage, so
they stay exactly as upstream wrote them.

## Licence

MIT, Copyright (c) 2026 Andrew Redican. See `LICENSE.md`.
