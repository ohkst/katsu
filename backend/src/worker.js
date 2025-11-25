export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Simple API to get recent winners from DB (if implemented)
    if (url.pathname === '/api/winners') {
      try {
        // Example D1 query
        const { results } = await env.DB.prepare(
          "SELECT * FROM winners ORDER BY timestamp DESC LIMIT 5"
        ).all();
        return Response.json(results);
      } catch (e) {
        return Response.json({ error: "Database not configured or empty" }, { status: 500 });
      }
    }

    return new Response('Katsu Lottery API', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};
