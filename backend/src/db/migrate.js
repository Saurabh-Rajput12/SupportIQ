const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./connection');

function runMigrations() {
  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('[Database] Applying schema migrations...');
  db.exec(schemaSql);
  console.log('[Database] Migrations applied successfully.');
}

if (require.main === module) {
  try {
    runMigrations();
    closeDb();
    process.exit(0);
  } catch (err) {
    console.error('[Database Migration Error]:', err);
    process.exit(1);
  }
}

module.exports = { runMigrations };

