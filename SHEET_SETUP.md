# Connect Lead Board to a Google Sheet

Takes about 5 minutes. When you're done, the Sheet is the database: rows you add there
show up on the board, and anything you drag or edit on the board is written back to the Sheet.

## 1. Create the Sheet

1. Go to [sheets.new](https://sheets.new) to create a blank Google Sheet. Name it something like "Lead Board".
2. (Optional) Rename the tab at the bottom to `Leads`. If you don't, the first tab is used.
3. In row 1, type these headers (one per column):

   `Contacts Name` · `Job Position` · `Priority` · `Email` · `Phone Number` · `Company` · `Day of First Contact` · `Day of Second Contact`

   You can skip this step: the script adds any missing headers by itself. "Day of Fist Contact" is also accepted.

The script also adds five columns that the board uses: **Stage, Order, Lead ID, Created At, Updated At**.
You can change **Stage** by hand (for example to `Contacted`). Leave **Order, Lead ID, Created At and Updated At** alone.

## 2. Add the script

1. In the Sheet, open **Extensions → Apps Script**.
2. Delete everything in the editor, then paste in the whole contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Click the **Save** icon (💾).
4. Add your secret key as a **Script Property**:
   1. Open the project's `.env.local` file and copy the long value after `SHEET_KEY=`.
   2. In the Apps Script editor, click **Project Settings** (the ⚙ gear in the left sidebar).
   3. Scroll down to **Script Properties** and click **Add script property** (or **Edit script properties**).
   4. **Property:** `SECRET`. **Value:** paste the key, with no spaces or quotes.
   5. Click **Save script properties**.

   Leave `const SECRET = 'PASTE-YOUR-KEY-HERE';` in the code as it is. The script property takes priority.
   (Pasting the key into that line instead also works, but then the key is visible to anyone who sees the code.)
5. (Optional but nice) In the function drop-down at the top choose **setup**, then click **Run**. This adds the headers,
   dropdown menus for Priority and Stage, and date formatting. Google will ask you to authorize it (see the note in step 3).

## 3. Deploy it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**. Google asks you to **Authorize access**. Pick your account. If you see "Google hasn't verified this app",
   click **Advanced → Go to (your project) (unsafe)**. This is normal for your own scripts: it only gets access to this Sheet.
5. Copy the **Web app URL** (it ends in `/exec`).

## 4. Connect the board

1. Open `.env.local` in the project folder and paste the URL after `SHEET_URL=`.
2. In the terminal running the board, press `Ctrl+C`, then start it again:

   ```powershell
   npm run dev
   ```

3. Open http://localhost:5173. The top-right corner should say **Google Sheet · synced**.

## Everyday use

- **Add a lead:** type a new row in the Sheet. The board picks it up when you switch back to the board's tab,
  every minute, or when you click **Refresh**. New rows land in **New Opportunity**.
- **Move or edit a lead:** do it on the board. It's saved to the Sheet within a second or two.
- **Delete a lead:** delete its row in the Sheet.

## If something goes wrong

| Message on the board | What to do |
| --- | --- |
| "Wrong key." | The `SECRET` script property doesn't match `SHEET_KEY` in `.env.local`. Check for extra spaces, quotes or a different property name. Fixing a script property takes effect right away, with no redeploy needed. |
| "SECRET is not set in the Apps Script" | No script property named exactly `SECRET` (all capitals) exists yet. Add it as in step 2.4. |
| "didn't send back data" | The deployment's "Who has access" isn't **Anyone**, or the URL isn't the `/exec` one. |
| Still says "Demo data" | `.env.local` is missing the URL or key, or you didn't restart `npm run dev`. |

**Changed the script later?** Every change needs **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**.
The URL stays the same.

**About privacy:** anyone who has both the web app URL and the key can read and change the Sheet's leads.
Don't share those two values. The board keeps them on its server side (`api/board.ts`), so they are
never sent to the browser. To use the board online, see [DEPLOY.md](DEPLOY.md).

## Testing without Google (for development)

`npm run fake-sheet` starts a local stand-in that runs the real `Code.gs` against an in-memory sheet on
http://localhost:8787 (key `local-test-key`). Point `.env.local` at it to try changes safely.
