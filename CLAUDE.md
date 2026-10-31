# Notes for Claude

- Use Bun for everything. Node is not set up on this machine.
- Several sessions work in parallel, each in its own git worktree. Each worktree's dev server has
  its own address: `http://<branch>.localhost:5173`. Slashes and other symbols in the branch name
  become dashes, so `claude/new-roads` becomes `claude-new-roads`.
- To test in the browser:
  1. Start the server with `preview_start` and the name `hitoria`.
  2. Read the address from the server output with `preview_logs`. Look for "Hitoria is running at".
     The port may not be 5173, because `preview_start` moves to a free port when 5173 is busy.
  3. Navigate to that address. Do not use the plain `http://localhost:<port>` address. It only
     lists the running copies.
  - If `preview_start` fails with "Another copy is already running" from this same folder, the
    server is already up. Navigate to the address in the error.
  - Take screenshots with `scale: 0.5`. Use full size only to inspect small details.
- Every change needs a changelog entry. See [changelog/README.md](changelog/README.md).
- Code is split into small files, in folders by domain. See [CODING_STANDARDS.md](CODING_STANDARDS.md).
