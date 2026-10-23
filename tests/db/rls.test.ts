import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, migratedDb } from "./harness";

const OWNER = "00000000-0000-0000-0000-00000000000a";
const STAFF = "00000000-0000-0000-0000-00000000000b";
const OTHER_OWNER = "00000000-0000-0000-0000-00000000000c";
const R1 = "10000000-0000-0000-0000-000000000001";
const R2 = "10000000-0000-0000-0000-000000000002";
const EMP = "20000000-0000-0000-0000-000000000001";
const PERIOD = "30000000-0000-0000-0000-000000000001";
const LINE = "40000000-0000-0000-0000-000000000001";
const DRY = "50000000-0000-0000-0000-000000000001";
const LINE_STATION = "50000000-0000-0000-0000-000000000002";
const COUNT = "60000000-0000-0000-0000-000000000001";
const TASK = "70000000-0000-0000-0000-000000000001";

let db: PGlite;

beforeAll(async () => {
  db = await migratedDb();
  await db.exec(`
    INSERT INTO auth.users (id, email) VALUES
      ('${OWNER}', 'owner@a.test'), ('${STAFF}', 'sam@kaizr.staff'), ('${OTHER_OWNER}', 'owner@b.test');
    INSERT INTO restaurants (id, owner_id, name) VALUES ('${R1}', '${OWNER}', 'A'), ('${R2}', '${OTHER_OWNER}', 'B');
    INSERT INTO restaurant_members (restaurant_id, user_id, role) VALUES
      ('${R1}', '${OWNER}', 'owner'), ('${R1}', '${STAFF}', 'staff'), ('${R2}', '${OTHER_OWNER}', 'owner');
    INSERT INTO employees (id, restaurant_id, user_id, full_name, hourly_rate) VALUES ('${EMP}', '${R1}', '${STAFF}', 'Sam', 15);
    INSERT INTO payroll_periods (id, restaurant_id, start_date, end_date) VALUES ('${PERIOD}', '${R1}', '2026-10-12', '2026-10-18');
    INSERT INTO payroll_lines (id, restaurant_id, period_id, employee_id, hours, hourly_rate, wages, total, paid)
      VALUES ('${LINE}', '${R1}', '${PERIOD}', '${EMP}', 10, 15, 150, 150, false);
    INSERT INTO sales (restaurant_id, platform, total) VALUES ('${R1}', 'pos', 100), ('${R1}', 'ubereats', 50);
  `);
});

describe("payroll", () => {
  it("staff cannot edit their own pay line", async () => {
    await asUser(db, STAFF, () => db.exec(`UPDATE payroll_lines SET total = 9999, paid = true WHERE id = '${LINE}'`));
    const { rows } = await db.query<{ total: string; paid: boolean }>(`SELECT total, paid FROM payroll_lines WHERE id = '${LINE}'`);
    expect(Number(rows[0]!.total)).toBe(150);
    expect(rows[0]!.paid).toBe(false);
  });

  it("staff can only acknowledge a paid line", async () => {
    const before = await asUser(db, STAFF, () => db.query<{ ok: boolean }>(`SELECT acknowledge_pay('${LINE}') AS ok`));
    expect(before.rows[0]!.ok).toBe(false);
    await db.exec(`UPDATE payroll_lines SET paid = true WHERE id = '${LINE}'`);
    const after = await asUser(db, STAFF, () => db.query<{ ok: boolean }>(`SELECT acknowledge_pay('${LINE}') AS ok`));
    expect(after.rows[0]!.ok).toBe(true);
  });

  it("a paid week is locked", async () => {
    await db.exec(`UPDATE payroll_periods SET status = 'paid' WHERE id = '${PERIOD}'`);
    await expect(
      asUser(db, OWNER, () => db.exec(`UPDATE payroll_lines SET total = 1 WHERE id = '${LINE}'`)),
    ).rejects.toThrow(/closed/);
    await db.exec(`UPDATE payroll_periods SET status = 'draft' WHERE id = '${PERIOD}'`);
  });
});

describe("time entries", () => {
  it("staff clock-in is forced to now and clock-out computes minutes server-side", async () => {
    await asUser(db, STAFF, () =>
      db.exec(`INSERT INTO time_entries (restaurant_id, employee_id, work_date, clock_in, minutes, source)
               VALUES ('${R1}', '${EMP}', current_date, now() - interval '30 hours', 999, 'manual')`),
    );
    const { rows } = await db.query<{ minutes: number; source: string; age: number }>(
      `SELECT minutes, source, extract(epoch FROM now() - clock_in)::int AS age FROM time_entries WHERE employee_id = '${EMP}'`,
    );
    expect(rows[0]).toMatchObject({ minutes: 0, source: "clock" });
    expect(rows[0]!.age).toBeLessThan(60);

    await asUser(db, STAFF, () => db.exec(`UPDATE time_entries SET clock_out = now(), minutes = 600 WHERE employee_id = '${EMP}'`));
    const closed = await db.query<{ minutes: number }>(`SELECT minutes FROM time_entries WHERE employee_id = '${EMP}'`);
    expect(closed.rows[0]!.minutes).toBeLessThan(2);
  });

  it("staff cannot rewrite a closed shift", async () => {
    await asUser(db, STAFF, () => db.exec(`UPDATE time_entries SET minutes = 600 WHERE employee_id = '${EMP}'`));
    const { rows } = await db.query<{ minutes: number }>(`SELECT minutes FROM time_entries WHERE employee_id = '${EMP}'`);
    expect(rows[0]!.minutes).toBeLessThan(2);
  });
});

describe("tenant isolation", () => {
  it("staff cannot read sales", async () => {
    const { rows } = await asUser(db, STAFF, () => db.query(`SELECT * FROM sales`));
    expect(rows).toHaveLength(0);
  });

  it("an owner cannot read another restaurant's sales", async () => {
    const { rows } = await asUser(db, OTHER_OWNER, () => db.query(`SELECT * FROM sales`));
    expect(rows).toHaveLength(0);
  });

  it("rows cannot be moved to another restaurant", async () => {
    await expect(
      asUser(db, OWNER, () => db.exec(`UPDATE sales SET restaurant_id = '${R2}' WHERE restaurant_id = '${R1}'`)),
    ).rejects.toThrow(/restaurant_id cannot be changed/);
  });

  it("sales_daily totals match for managers and are empty for staff", async () => {
    const owner = await asUser(db, OWNER, () =>
      db.query<{ gross: string }>(`SELECT sum(gross) AS gross FROM sales_daily('${R1}', current_date - 1, current_date + 1, 'UTC')`),
    );
    expect(Number(owner.rows[0]!.gross)).toBe(150);
    const staff = await asUser(db, STAFF, () =>
      db.query(`SELECT * FROM sales_daily('${R1}', current_date - 1, current_date + 1, 'UTC')`),
    );
    expect(staff.rows).toHaveLength(0);
  });
});

describe("inventory", () => {
  it("low_stock_items compares stock to each item's own reorder level", async () => {
    await db.exec(`INSERT INTO inventory_items (restaurant_id, name, unit, current_stock, reorder_level) VALUES
      ('${R1}', 'Flour', 'lb', 2, 10), ('${R1}', 'Oil', 'L', 20, 5)`);
    const { rows } = await asUser(db, STAFF, () => db.query<{ name: string }>(`SELECT name FROM low_stock_items('${R1}')`));
    expect(rows.map((r) => r.name)).toEqual(["Flour"]);
  });

  it("completing a count for one area keeps stock held in other areas", async () => {
    const { rows: items } = await db.query<{ id: string }>(`SELECT id FROM inventory_items WHERE name = 'Flour'`);
    const item = items[0]!.id;
    await db.exec(`
      INSERT INTO storage_locations (id, restaurant_id, name) VALUES ('${DRY}', '${R1}', 'Dry'), ('${LINE_STATION}', '${R1}', 'Line');
      INSERT INTO item_locations (restaurant_id, location_id, inventory_item_id, last_count) VALUES
        ('${R1}', '${DRY}', '${item}', NULL), ('${R1}', '${LINE_STATION}', '${item}', 4);
      INSERT INTO inventory_counts (id, restaurant_id) VALUES ('${COUNT}', '${R1}');
      INSERT INTO inventory_count_lines (restaurant_id, count_id, location_id, inventory_item_id, quantity, unit_cost)
        VALUES ('${R1}', '${COUNT}', '${DRY}', '${item}', 7, 1);
    `);
    await asUser(db, STAFF, () => db.query(`SELECT complete_inventory_count('${COUNT}')`));
    const { rows } = await db.query<{ current_stock: string }>(`SELECT current_stock FROM inventory_items WHERE id = '${item}'`);
    expect(Number(rows[0]!.current_stock)).toBe(11);
  });
});

describe("cross-tenant links", () => {
  it("a count line cannot point at another restaurant's location", async () => {
    await db.exec(`INSERT INTO storage_locations (id, restaurant_id, name) VALUES ('50000000-0000-0000-0000-000000000009', '${R2}', 'B freezer')`);
    const { rows: items } = await db.query<{ id: string }>(`SELECT id FROM inventory_items WHERE name = 'Oil'`);
    await db.exec(`INSERT INTO inventory_counts (id, restaurant_id) VALUES ('60000000-0000-0000-0000-000000000002', '${R1}')`);
    await expect(
      asUser(db, STAFF, () =>
        db.exec(`INSERT INTO inventory_count_lines (restaurant_id, count_id, location_id, inventory_item_id, quantity)
                 VALUES ('${R1}', '60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000009', '${items[0]!.id}', 1)`),
      ),
    ).rejects.toThrow(/same restaurant/);
  });
});

describe("checklists", () => {
  it("an author cannot reassign their completion to someone else", async () => {
    await db.exec(`
      INSERT INTO shift_tasks (id, restaurant_id, area, shift, title) VALUES ('70000000-0000-0000-0000-000000000002', '${R1}', 'foh', 'closing', 'Lock up');
      INSERT INTO shift_task_completions (restaurant_id, task_id, completed_by) VALUES ('${R1}', '70000000-0000-0000-0000-000000000002', '${STAFF}');
    `);
    await expect(
      asUser(db, STAFF, () =>
        db.exec(`UPDATE shift_task_completions SET completed_by = '${OWNER}' WHERE task_id = '70000000-0000-0000-0000-000000000002'`),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("a member cannot delete someone else's completion", async () => {
    await db.exec(`
      INSERT INTO shift_tasks (id, restaurant_id, area, shift, title) VALUES ('${TASK}', '${R1}', 'foh', 'opening', 'Unlock');
      INSERT INTO shift_task_completions (restaurant_id, task_id, completed_by) VALUES ('${R1}', '${TASK}', '${OWNER}');
    `);
    await asUser(db, STAFF, () => db.exec(`DELETE FROM shift_task_completions`));
    const { rows } = await db.query(`SELECT 1 FROM shift_task_completions`);
    expect(rows).toHaveLength(1);
  });
});
