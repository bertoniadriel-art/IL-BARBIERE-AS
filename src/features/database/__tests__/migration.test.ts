import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION_PATH = resolve(__dirname, '../migrations/2026-05-25_mvp_core.sql');

const SCHEMA_PATH = resolve(__dirname, '../schema.sql');

function readSQL(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

describe('Migration: 2026-05-25_mvp_core.sql', () => {
  describe('T1.1 — migration file structure', () => {
    it('contains ADD COLUMN for barbers.role', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(/alter table public\.barbers add column if not exists role/i);
    });

    it('contains ADD COLUMN for barbers.image', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(/alter table public\.barbers add column if not exists image/i);
    });

    it('contains ADD COLUMN for appointments.is_fixed_weekly', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(
        /alter table public\.appointments add column if not exists is_fixed_weekly/i
      );
    });

    it('contains ADD COLUMN for appointments.final_price as integer', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(
        /alter table public\.appointments add column if not exists final_price integer/i
      );
    });

    it('contains ADD COLUMN for appointments.deposit_paid', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(
        /alter table public\.appointments add column if not exists deposit_paid/i
      );
    });

    it('contains CTE soft-cancel dedup block', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(/with ranked as/i);
      expect(sql).toMatch(/row_number\(\) over/i);
      expect(sql).toMatch(/partition by barber_id, appointment_date, appointment_time/i);
    });

    it('contains the named unique constraint appointments_unique_slot', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(/add constraint appointments_unique_slot/i);
      expect(sql).toMatch(/unique \(barber_id, appointment_date, appointment_time\)/i);
    });

    it('is wrapped in a transaction (begin/commit)', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(/^\s*begin;/im);
      expect(sql).toMatch(/^\s*commit;/im);
    });
  });

  describe('T1.2 — schema.sql parity', () => {
    it('schema.sql contains appointments_unique_slot constraint', () => {
      const sql = readSQL(SCHEMA_PATH);
      expect(sql).toMatch(/appointments_unique_slot/i);
    });

    it('schema.sql references final_price column', () => {
      const sql = readSQL(SCHEMA_PATH);
      expect(sql).toMatch(/final_price/i);
    });

    it('schema.sql references deposit_paid column', () => {
      const sql = readSQL(SCHEMA_PATH);
      expect(sql).toMatch(/deposit_paid/i);
    });

    it('schema.sql references is_fixed_weekly column', () => {
      const sql = readSQL(SCHEMA_PATH);
      expect(sql).toMatch(/is_fixed_weekly/i);
    });

    it('schema.sql references barbers.role column', () => {
      const sql = readSQL(SCHEMA_PATH);
      expect(sql).toMatch(/\brole\b/i);
    });
  });

  describe('T1.3 — RLS policies in schema.sql', () => {
    it('schema.sql contains barber-scoped appointments SELECT policy', () => {
      const sql = readSQL(SCHEMA_PATH);
      // Policy uses auth.uid() joined through barber_id
      expect(sql).toMatch(/create policy[\s\S]*?appointments[\s\S]*?select/i);
      expect(sql).toMatch(/auth\.uid\(\)/i);
    });

    it('schema.sql contains RLS policy for appointments UPDATE scoped to barber', () => {
      const sql = readSQL(SCHEMA_PATH);
      expect(sql).toMatch(/create policy[\s\S]*?appointments[\s\S]*?update/i);
    });

    it('schema.sql contains open SELECT policy for services', () => {
      const sql = readSQL(SCHEMA_PATH);
      expect(sql).toMatch(/create policy[\s\S]*?services[\s\S]*?select/i);
    });

    it('schema.sql contains open SELECT policy for barbers', () => {
      const sql = readSQL(SCHEMA_PATH);
      expect(sql).toMatch(/create policy[\s\S]*?barbers[\s\S]*?select/i);
    });

    it('migration file contains RLS policy definitions', () => {
      const sql = readSQL(MIGRATION_PATH);
      expect(sql).toMatch(/create policy/i);
      expect(sql).toMatch(/auth\.uid\(\)/i);
    });
  });
});
