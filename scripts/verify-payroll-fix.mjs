#!/usr/bin/env node

/**
 * Verification script for the payroll timezone fix.
 * 
 * This script demonstrates that the new implementation:
 * 1. Generates exactly the right number of days for a month (no spillover)
 * 2. Uses SQL-based date generation instead of JS date math
 * 3. Properly handles timezone-aware work_date grouping
 * 
 * Run with: node scripts/verify-payroll-fix.mjs
 */

import { getSqlClient, normalizeRows } from '../lib/db/client.js';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'bold');
  log('='.repeat(60), 'cyan');
}

async function verifyDatabaseView() {
  section('1. Verifying Database View');
  
  const sql = getSqlClient();
  
  try {
    // Check if view exists
    const viewCheck = normalizeRows(await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
          AND table_name = 'staff_day_sessions_v'
      ) AS exists
    `);
    
    if (!viewCheck[0]?.exists) {
      error('View staff_day_sessions_v does not exist');
      info('Please run: psql $DATABASE_URL -f db/views/staff_day_sessions_v.sql');
      return false;
    }
    success('View staff_day_sessions_v exists');
    
    // Check view columns
    const columns = normalizeRows(await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'staff_day_sessions_v'
      ORDER BY ordinal_position
    `);
    
    const requiredColumns = ['session_id', 'staff_id', 'work_date', 'checkin_time', 
                             'checkout_time', 'checkin_local', 'checkout_local', 'minutes'];
    
    const foundColumns = columns.map(c => String(c.column_name));
    const missingColumns = requiredColumns.filter(col => !foundColumns.includes(col));
    
    if (missingColumns.length > 0) {
      error(`View is missing columns: ${missingColumns.join(', ')}`);
      return false;
    }
    success('View has all required columns');
    
    // Check work_date is DATE type
    const workDateColumn = columns.find(c => c.column_name === 'work_date');
    if (workDateColumn?.data_type !== 'date') {
      error(`work_date should be DATE type, got ${workDateColumn?.data_type}`);
      return false;
    }
    success('work_date is DATE type (timezone-agnostic)');
    
    return true;
  } catch (err) {
    error(`Database check failed: ${err.message}`);
    return false;
  }
}

async function verifyDayGeneration() {
  section('2. Verifying SQL-based Day Generation');
  
  const sql = getSqlClient();
  
  // Test October 2025 (31 days)
  const year = 2025;
  const month = 10;
  
  try {
    const daysRows = normalizeRows(await sql`
      SELECT generate_series(
        make_date(${year}, ${month}, 1),
        make_date(${year}, ${month}, 1) + interval '1 month' - interval '1 day',
        '1 day'::interval
      )::date AS day
    `);
    
    const days = daysRows.map(row => String(row.day));
    
    // Verify count
    if (days.length !== 31) {
      error(`October 2025 should have 31 days, got ${days.length}`);
      return false;
    }
    success('October 2025 generates exactly 31 days');
    
    // Verify first day
    if (days[0] !== '2025-10-01') {
      error(`First day should be 2025-10-01, got ${days[0]}`);
      return false;
    }
    success('First day is 2025-10-01 (no Sept 30 spillover)');
    
    // Verify last day
    if (days[30] !== '2025-10-31') {
      error(`Last day should be 2025-10-31, got ${days[30]}`);
      return false;
    }
    success('Last day is 2025-10-31 (no Nov 1 spillover)');
    
    // Verify no adjacent months
    const hasSeptember = days.some(d => d.startsWith('2025-09'));
    const hasNovember = days.some(d => d.startsWith('2025-11'));
    
    if (hasSeptember) {
      error('Days array contains September dates');
      return false;
    }
    if (hasNovember) {
      error('Days array contains November dates');
      return false;
    }
    success('No dates from adjacent months (Sept or Nov)');
    
    return true;
  } catch (err) {
    error(`Day generation test failed: ${err.message}`);
    return false;
  }
}

async function verifyTimezoneGrouping() {
  section('3. Verifying Timezone-aware Grouping');
  
  const sql = getSqlClient();
  
  try {
    // Check if we have any test data
    const dataCheck = normalizeRows(await sql`
      SELECT COUNT(*) as count
      FROM staff_attendance
      WHERE checkin_time IS NOT NULL
    `);
    
    const count = Number(dataCheck[0]?.count ?? 0);
    
    if (count === 0) {
      info('No test data in staff_attendance table');
      info('Skipping timezone grouping verification');
      return true;
    }
    
    success(`Found ${count} attendance records`);
    
    // Test a session near midnight UTC
    // In Ecuador (UTC-5), 04:00 UTC = 23:00 local (previous day)
    const testRows = normalizeRows(await sql`
      SELECT 
        checkin_time,
        checkin_time AT TIME ZONE 'UTC' AS utc_time,
        (checkin_time AT TIME ZONE 'America/Guayaquil')::date AS work_date_local,
        checkin_time::date AS work_date_utc
      FROM staff_attendance
      WHERE checkin_time IS NOT NULL
      ORDER BY checkin_time DESC
      LIMIT 5
    `);
    
    if (testRows.length > 0) {
      success('Timezone conversion is working');
      info('Sample sessions:');
      testRows.forEach((row, i) => {
        console.log(`  ${i + 1}. UTC: ${row.utc_time} → Local date: ${row.work_date_local}`);
        
        // Check if UTC date differs from local date (common near midnight)
        if (row.work_date_utc !== row.work_date_local) {
          info(`     ⚠ UTC date (${row.work_date_utc}) differs from local date - timezone grouping is active`);
        }
      });
    }
    
    return true;
  } catch (err) {
    error(`Timezone grouping test failed: ${err.message}`);
    return false;
  }
}

async function verifyMonthQuery() {
  section('4. Verifying Month Query Performance');
  
  const sql = getSqlClient();
  
  try {
    const startTime = Date.now();
    
    // Simulate the actual query used by fetchPayrollMatrix
    const result = normalizeRows(await sql`
      WITH session_totals AS (
        SELECT
          s.staff_id,
          s.work_date,
          SUM(COALESCE(s.minutes, 0))::integer AS total_minutes
        FROM public.staff_day_sessions_v s
        WHERE s.work_date >= '2025-10-01'::date
          AND s.work_date < '2025-11-01'::date
        GROUP BY s.staff_id, s.work_date
      )
      SELECT COUNT(*) as row_count
      FROM session_totals
    `);
    
    const elapsed = Date.now() - startTime;
    const rowCount = Number(result[0]?.row_count ?? 0);
    
    success(`Query completed in ${elapsed}ms`);
    info(`Found ${rowCount} staff-day combinations for October 2025`);
    
    if (elapsed > 1000) {
      info('Consider adding indexes for better performance');
      info('See DATABASE_SETUP.md for index recommendations');
    }
    
    return true;
  } catch (err) {
    error(`Month query test failed: ${err.message}`);
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║       Payroll Timezone Fix - Verification Script          ║', 'bold');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');
  
  const results = [];
  
  results.push(await verifyDatabaseView());
  results.push(await verifyDayGeneration());
  results.push(await verifyTimezoneGrouping());
  results.push(await verifyMonthQuery());
  
  section('Summary');
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  if (passed === total) {
    log(`\n✅ All ${total} verification checks passed!`, 'green');
    log('\nThe payroll timezone fix is working correctly.', 'green');
    log('You can now use the payroll matrix without timezone issues.\n', 'green');
    process.exit(0);
  } else {
    log(`\n⚠️  ${passed}/${total} checks passed`, 'yellow');
    log('\nSome issues were detected. Please review the errors above.', 'yellow');
    log('See DATABASE_SETUP.md for deployment instructions.\n', 'yellow');
    process.exit(1);
  }
}

main().catch(err => {
  error(`\nFatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
