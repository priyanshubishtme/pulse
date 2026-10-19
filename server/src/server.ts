import app from './app';
import { config } from './config';
import { connectRedis, disconnectRedis } from './lib/redis';
import { startClickQueue, stopClickQueue } from './modules/clicks/clickQueue';
import prisma from './lib/prisma';

const PORT = config.port;

async function start() {
  await connectRedis();
  await startClickQueue();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(async () => {
      try {
        await stopClickQueue();
        await disconnectRedis();
        await prisma.$disconnect();
        process.exit(0);
      } catch (error) {
        console.error('Graceful shutdown failed:', error);
        process.exit(1);
      }
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

start().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
