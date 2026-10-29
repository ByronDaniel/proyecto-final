import { loadConfig } from './config.js';
import { connectMongo } from './infrastructure/mongo.js';
import { createApp } from './interfaces/app.js';
import { RmaService } from './application/rma.js';

const config = loadConfig();
const store = await connectMongo(config.mongoUri, config.mongoDatabase);
const service = new RmaService(store);
await service.synchronizeAll();
const scheduler = setInterval(() => service.synchronizeAll().catch(() => console.error('Unable to synchronize scheduled versions')), 5000);
const server = createApp(store, config).listen(config.port, async error => {
	if (error) {
		clearInterval(scheduler);
		await store.client.close();
		console.error(`Unable to listen on port ${config.port}: ${error.code || error.message}`);
		process.exitCode = 1;
		return;
	}
	console.log(`RMA listening on port ${config.port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { clearInterval(scheduler); server.close(async () => { await store.client.close(); process.exit(0); }); });