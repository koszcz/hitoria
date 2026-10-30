// Dev server: serves the game and saves crash reports from the browser to crashes/.
import index from './index.html';

const server = Bun.serve({
  port: Number(process.env.PORT) || 5173,
  development: true,
  routes: {
    '/': index,
    '/crash': {
      async POST(req) {
        const name = `crashes/${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
        await Bun.write(name, await req.text());
        console.error(`💥 The game crashed. Report saved to ${name}`);
        return new Response('saved');
      },
    },
  },
});
console.log(`Hitoria is running at ${server.url}`);
