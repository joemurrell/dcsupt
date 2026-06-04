const { initializeDatabase } = require('./db');
const { createApp } = require('./app');

async function start() {
  const db = await initializeDatabase();
  const app = createApp(db);
  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    console.log(`DCS UPT app listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
