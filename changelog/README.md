# Changelog

Every change to Hitoria gets an entry here. Each entry is one Markdown file in
[entries/](entries/), with before and after screenshots in [shots/](shots/).
`bun run changelog` turns them into `changelog.html`. The build also puts the page online at
https://koszcz.github.io/hitoria/changelog.html.

Each change has its own file, so sessions that work in parallel never edit the same file.

## Add an entry

Add the entry in the same commit as the change, or in the last commit of the branch.

1. Create `entries/<date>-<short-name>.md`, such as `entries/2026-10-30-storehouse.md`.
2. Fill it in like this:

   ```markdown
   ---
   title: Storehouse
   date: '2026-10-30 22:36'
   shots:
     - name: card
       caption: The storehouse in the build menu.
       steps:
         - key: b
         - hover: '#buildmenu .tile[data-type="storehouse"]'
         - wait: 500
   ---
   You can now build a storehouse. Spare goods go to the nearest store by road.
   ```

3. Write the body for players. Say what they can now see or do. Use plain words.
4. If the change shows in the game, take the screenshots:

   ```bash
   bun run changelog:shots 2026-10-30-storehouse
   ```

5. Look at the screenshots in `shots/<entry>/`. Check that they show the change.
   If not, change the steps and run the command again.
6. Commit the entry and its screenshots together with the change.

## Fields

| Field | Required | What it holds |
| --- | --- | --- |
| `title` | Yes | A short name for the change. |
| `date` | Yes | `'YYYY-MM-DD HH:MM'`, in quotes. Entries are listed newest first. |
| `kind` | No | `dev` for changes players don't see, such as tests or tooling. These are hidden on the page unless the reader asks for them. Leave it out for game changes. |
| `shots` | No | The screenshots to take. Leave it out if the change doesn't show in the game. |
| `commit` | No | The commit that made the change. Leave it out. It defaults to the commit that added the entry file. |
| `before` | No | The version to compare with, as a commit or branch. Leave it out unless the default is wrong. |

## How screenshots are taken

`bun run changelog:shots` builds two versions of the game and opens each in headless Chrome:

- **After** is this checkout as it is now, including uncommitted changes. Once the entry is
  committed, it is the commit that added the entry.
- **Before** is the point where your branch left `main`. Once the entry is committed, it is the
  commit before the one that added the entry. If the change spans several commits, set `before`.

Both versions start a new game on the same island, with no saves. The window is 1280 × 800.
The camera starts on the HQ, in the middle of the screen. After the island loads, the tool runs
each shot's steps:

| Step | What it does |
| --- | --- |
| `wait: 500` | Waits this many milliseconds. |
| `key: '1'` | Presses a key. Join keys with `+` to hold them together, as in `Control+s`. |
| `click: '#buildbar button'` | Clicks the middle of the first element that matches a CSS selector. |
| `click: [80, -100]` | Clicks this many pixels right and down from the middle of the screen. Negative numbers go left and up. |
| `hover: ...` | Moves the mouse there, without clicking. Takes a selector or pixels, like `click`. |

If the before version has no element for a selector, the tool skips that step.

To take the screenshots for every entry again, run `bun run changelog:shots --all`.
This takes a few minutes the first time, because it builds each version.
