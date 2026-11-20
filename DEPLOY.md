# Put Lead Board online (Vercel)

Once this is done, you can open your board from any computer or phone at an address like
`https://lead-board-yourname.vercel.app`. A password screen guards it.

**How it stays private:**
- The page itself contains no secrets.
- A small server function on Vercel (`api/board.ts`) holds your Sheet URL and key. It only talks to the
  Sheet for someone who has logged in with your password.
- If no password is set on Vercel, the board refuses everyone.

You need: a free **GitHub** account (stores the code) and a free **Vercel** account (runs the site).

## 1. Put the code on GitHub (private)

1. Sign in at [github.com](https://github.com) and click **New repository**.
2. Name it `lead-board`, choose **Private**, and don't add a README or .gitignore. Click **Create repository**.
3. In a terminal in the project folder, run the two commands GitHub shows under
   "…or push an existing repository from the command line". They look like:

   ```powershell
   git remote add origin https://github.com/YOUR-USERNAME/lead-board.git
   ```
   ```powershell
   git push -u origin main
   ```

   `.env.local` (your URL, key and password) is **not** uploaded. Git is set to ignore it.

## 2. Create the site on Vercel

1. Go to [vercel.com](https://vercel.com), choose **Sign Up → Hobby**, and **Continue with GitHub**.
2. Click **Add New… → Project**, find `lead-board` and click **Import**.
   (If it isn't listed, click **Adjust GitHub App Permissions** and allow access to that repository.)
3. Vercel detects **Vite** by itself. Leave the build settings as they are.
4. Open **Environment Variables** and add these three (copy the values from your `.env.local`):

   | Name | Value |
   | --- | --- |
   | `SHEET_URL` | your Apps Script web app URL (ends in `/exec`) |
   | `SHEET_KEY` | the same key as the `SECRET` script property |
   | `APP_PASSWORD` | a password you choose for logging in (long and unique; not your Google password) |

   Don't add any name starting with `VITE_`: those would be copied into the public page.
5. Click **Deploy**. After about a minute you get your address. Open it, enter your password, done.

## Everyday use

- You stay logged in on that device for 30 days. **Log out** is at the top right.
- Every time you push new code to GitHub (`git push`), Vercel rebuilds the site automatically.

## Changing settings later

In Vercel: **Project → Settings → Environment Variables**, edit the value, then **Deployments → ⋯ on the latest →
Redeploy**. Settings only take effect after a redeploy.

- **Changing `APP_PASSWORD`** logs out every device that was logged in.
- **Changing the key** means updating it in three places: the `SECRET` script property in Apps Script,
  `SHEET_KEY` on Vercel, and `.env.local` on your computer.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "APP_PASSWORD is not set on the server, so access is blocked." | Add `APP_PASSWORD` on Vercel, then redeploy. |
| The board shows demo data | `SHEET_URL` or `SHEET_KEY` is missing on Vercel. Add them, then redeploy. |
| "Wrong key." | `SHEET_KEY` on Vercel doesn't match the `SECRET` script property. |
| "Wrong password." | Check `APP_PASSWORD` on Vercel (it's case-sensitive). |

## On your own computer

`npm run dev` works as before. If `APP_PASSWORD` is empty in `.env.local`, there's no login screen on
`localhost`. Set one there if you want to try the login locally.
