# Lead Board on GitHub Pages

The board is published as a static site at `https://YOUR-USERNAME.github.io/lead-board/`.
It rebuilds automatically every time code is pushed to the `main` branch
(see [.github/workflows/pages.yml](.github/workflows/pages.yml)).

## How the login works

- GitHub Pages has no server, so the page talks directly to your Apps Script web app.
- The web app URL is built into the page. On its own it's useless: the script refuses every request without the key.
- **Your access key is your password.** It's the same value as the `SECRET` script property in Apps Script
  (and `SHEET_KEY` in your `.env.local`). It is never part of the code or the site.
- The first time you open the site on a device, type the key. That browser remembers it until you click **Log out**.
- Avoid logging in on shared computers, or click **Log out** when you're done.

**Tip:** pick a key you can type on your phone, like a long phrase (`purple-otter-sails-at-dawn-1987`).
To change it, update the `SECRET` script property in Apps Script and `SHEET_KEY` in `.env.local`. Devices that
remembered the old key show the login screen again.

## One-time setup (already done if the site works)

1. Create a **public** repository named `lead-board` and push this project to it.
2. **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   name `SHEET_URL`, value = your Apps Script web app URL (ends in `/exec`).
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. **Actions** tab → **Publish to GitHub Pages** → **Run workflow** (or just push a change).

## Changing the Sheet URL

Edit the `SHEET_URL` variable (step 2), then re-run the workflow (step 4).

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "Wrong access key." | The key doesn't match the `SECRET` script property. Check for extra spaces. |
| The site shows demo data | The `SHEET_URL` variable is missing. Add it and re-run the workflow. |
| "didn't send back data" | The Apps Script deployment's "Who has access" isn't **Anyone**. |
| Blank page or 404 | Settings → Pages → Source must be **GitHub Actions**; check the Actions tab for a failed run. |

## On your own computer

`npm run dev` works as before, using the server function and `.env.local`, with no login on localhost.
