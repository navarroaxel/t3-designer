# Deployment on Vercel

The app is a static Vite build with no server, database or secrets, so it can be
served by any static host. `vercel.json` describes the Vercel setup.

| Setting | Value |
| --- | --- |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm --filter @t3-designer/web build` |
| Output directory | `dist`, at the repository root |
| Node.js | 24 or newer |
| Package manager | pnpm 12.7.0, taken from the `packageManager` field |
| Rewrites | every path falls back to `index.html`, so `/privacy` opens directly |

## Publish

1. Push the repository to GitHub, GitLab or Bitbucket and import it in Vercel, or run `npx vercel` from the repository root and answer the prompts (`npx vercel --prod` for the production URL).
2. Leave the four `VITE_UMAMI_*` variables unset. Analytics then stays off and the consent banner says so.
3. Choose a project name and domain that do not contain the street number.

## If Vercel says `No Output Directory named "dist" found`

Vercel expects `dist` at the project root, and the app builds into `apps/web/dist`.
`vite.config.ts` therefore also copies the build to `dist` at the repository root,
but only when Vercel sets the `VERCEL` variable, so local builds are unchanged.
If the error comes back, check **Settings → Build and Development Settings**: leave
**Root Directory** empty and turn off any Output Directory override, or set it to `dist`.

## Social preview and search engines

`apps/web/index.html` carries the title, description, Open Graph and Twitter tags,
the theme colours, the icon and the structured data. They are fixed in the file
because link previews do not run JavaScript, so they are bilingual (Spanish and
English). The running app still sets the page title in the visitor's language.

Two things depend on the deployment and are added at build time by `site-meta.ts`:

| Variable | Effect |
| --- | --- |
| `VERCEL_PROJECT_PRODUCTION_URL` | Set by Vercel. Gives the absolute address of the preview image (`og:image`, `twitter:image`) |
| `VITE_SITE_URL` | Set it to your own domain, for example `https://example.com`. It wins over the Vercel one |
| `VITE_ROBOTS` | Robots directives. The default is `index, follow`; use `noindex, nofollow` to keep search engines away |

Without a URL, as in local builds, the preview image tags are left out. There is no
canonical link or `og:url` on purpose: the page is one HTML file for every path, so a
fixed one would mislabel `/privacy`. `robots.txt` allows crawling; `noindex` is what
keeps a page out of the results.

`public/og-image.png` is a 1200 by 630 screenshot of the app with its controls
hidden; replace it with another image of the same size and the test will check it.
Social networks cache previews, so refresh them with the Facebook Sharing Debugger or
the LinkedIn Post Inspector after a change.

## Before making it public

- The house number and exact coordinates are not in the code or the build: the street is shown as "Tapalque" and the coordinates are rounded to two decimals (about 1 km). Check that any repository you publish was committed after that change, because git history keeps earlier versions.
- The imagery used to measure the site (Google Earth and Street View) was only read, never copied into the repository. Keep it that way.
- The privacy notice at `/privacy` describes analytics that is disabled by default. If you enable Umami, fill in the retention and contact facts listed in [analytics.md](analytics.md) first.
