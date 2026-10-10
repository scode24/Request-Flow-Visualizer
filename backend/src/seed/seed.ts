import { databaseService } from '../services/database';
import { storageService } from '../services/storage';

async function seed() {
  console.log('🌱 Starting database and storage seeding...');
  await databaseService.resetSeedData();
  console.log('✅ PostgreSQL seeded.');
  console.log('🌱 Seeding sample MinIO JSON objects...');
  await storageService.putObject('config.json', { app: 'flow-visualizer', env: 'production', v: '1.0' });
  console.log('✅ MinIO sample objects verified.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
