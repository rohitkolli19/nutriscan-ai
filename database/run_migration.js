/**
 * NutriScan AI — Run database migration via Supabase
 * Usage: node database/run_migration.js
 */
require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SQL = fs.readFileSync(
  path.join(__dirname, 'migrations/001_initial_schema.sql'),
  'utf8'
);

// Split SQL into individual statements (skip comments and empty lines)
const statements = SQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function runMigration() {
  console.log('🚀 Running NutriScan AI database migration...\n');

  // Use Supabase's rpc to execute raw SQL via pg_execute or direct API call
  // Since Supabase JS client doesn't support raw DDL, we use the REST API
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;

  // Try using fetch to POST the SQL directly to Supabase's SQL endpoint
  const { default: fetch } = await import('node-fetch');

  const response = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/`,
    {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  // Use the Supabase management API to run SQL
  // The project ref is extracted from the URL
  const projectRef = process.env.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    console.error('❌ Could not extract project ref from SUPABASE_URL');
    process.exit(1);
  }

  console.log(`📦 Project: ${projectRef}`);
  console.log('⚠️  This script requires the Supabase Management API token.');
  console.log('');
  console.log('Please run the migration manually:');
  console.log('1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  console.log('2. Paste and run: database/migrations/001_initial_schema.sql');
  console.log('');
  console.log('OR install supabase CLI:');
  console.log('  brew install supabase/tap/supabase');
  console.log('  supabase db push --db-url "postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"');
  process.exit(0);
}

runMigration().catch(console.error);
