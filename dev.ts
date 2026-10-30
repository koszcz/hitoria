// Dev server: serves the game and saves crash and problem reports from the browser to reports/.
import index from './index.html';

const server = Bun.serve({
  port: Number(process.env.PORT) || 5173,
  development: true,
  routes: {
    '/': index,
    '/report/:kind': {
      async POST(req) {
        const kind = req.params.kind === 'crash' ? 'crash' : 'problem';
        const name = `reports/${new Date().toISOString().replace(/[:.]/g, '-')}-${kind}.md`;
        await Bun.write(name, await req.text());
        console.error(`${kind === 'crash' ? '💥 The game crashed' : '🐞 Problem reported'}. Report saved to ${name}`);
        return new Response(name);
      },
    },
  },
});
console.log(`Hitoria is running at ${server.url}`);
