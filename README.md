# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## CHEM 2210 acid-base titration practice

The GitHub Pages practice app is in `docs/index.html`. Its acid-base titration
module (`docs/acidbase-titrations.js`) covers a weak monoprotic acid titrated with
NaOH, a weak monoprotic base titrated with HCl, and a diprotic acid titrated with
NaOH. The generated regions are buffer, equivalence and excess titrant; the
calculator also supports initial solutions and arbitrary titrant volumes.

All answers assume ideal concentration equilibria at 25 °C, with Kw = 1e-14.
Total solution volume includes titrant. The calculation solves electroneutrality
with analyte mass balance and water autoionization, using log-space bisection.
For a weak base, the conjugate-acid Ka is Kw/Kb. At weak-acid equivalence,
the conjugate-base Kb is Kw/Ka, not the original acid's Ka.

For diprotic acids both dissociations are included. In particular, the supplied
Ka1 = 0.059 is comparable to the analytical concentration: using stoichiometric
mole ratios for the first buffer, or simply averaging pKa1 and pKa2 at the first
equivalence point, is inaccurate. With 50.0 mL of 0.100 M H2A and 0.200 M NaOH,
Ka1 = 0.059 and Ka2 = 6.4e-5, the full equilibrium gives pH 1.755 at 13.75 mL
and 2.856 at 25.0 mL (the old approximations gave 1.316 and 2.712).
The second buffer, second equivalence and excess branches are also evaluated
with the complete equilibrium, preserving their limiting textbook behavior.
Worked solutions identify the region and show the equations used.

Non-equivalence answers use the two-decimal titrant volume shown in the prompt.
Equivalence questions explicitly specify the equivalence point, marking the
printed volume as approximate, and use the exact stoichiometric volume.

Run the dependency-free chemistry regression suite with:

```bash
npm run test:titrations
```

It checks independently calculated cubic/quartic reference roots, initial,
buffer, half-equivalence, equivalence and excess regions, dilute solutions,
curve continuity, species balances, all generated regions, prompt/solution
consistency and browser grading. `npm test` runs these checks before the
existing build and rendered-page tests. GitHub Actions runs the chemistry suite
on pushes and pull requests.

Reference for the full diprotic equilibrium model:
[Morales and Arango, Geometric-algebraic approach to aqueous solutions of diprotic acids and its buffer mixtures](https://arxiv.org/abs/2309.17387).
