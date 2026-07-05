-- ============================================
-- RESET SUPABASE DATABASE
-- Copy & paste toàn bộ script này vào Supabase SQL Editor
-- ============================================

-- Clear all operational data
DELETE FROM sales_activities;
DELETE FROM sales_leads;
DELETE FROM customer_care_assignments;
DELETE FROM loyalty_vouchers;
DELETE FROM inventory_movements;
DELETE FROM referral_transactions;
DELETE FROM wholesale_accounts;
DELETE FROM partners_pt;
DELETE FROM combo_subscriptions;
DELETE FROM delivery_logs;
DELETE FROM combo_transfers;
DELETE FROM orders;
DELETE FROM shifts;
DELETE FROM customers;
DELETE FROM employees;
DELETE FROM branches;
DELETE FROM branch_inventory;

-- Clear and reseed inventory
DELETE FROM inventory;

INSERT INTO inventory (id, name, unit, "currentStock", "minStock", cost, category) VALUES
('INV-001', 'Dau tay', 'kg', 0, 5.0, 80000, 'fruit'),
('INV-002', 'Xoai', 'kg', 0, 6.0, 40000, 'fruit'),
('INV-003', 'Chuoi', 'kg', 0, 3.0, 20000, 'fruit'),
('INV-004', 'Bo', 'kg', 0, 5.0, 60000, 'fruit'),
('INV-005', 'Dua', 'kg', 0, 2.0, 25000, 'fruit'),
('INV-006', 'Viet quat', 'kg', 0, 2.0, 150000, 'fruit'),
('INV-007', 'Rau bina', 'kg', 0, 1.5, 35000, 'fruit'),
('INV-024', 'Dau tam', 'kg', 0, 1.5, 120000, 'fruit'),
('INV-025', 'Phuc bon tu', 'kg', 0, 1.5, 150000, 'fruit'),
('INV-026', 'Thanh long', 'kg', 0, 2.0, 35000, 'fruit'),
('INV-008', 'Sua tuoi', 'lít', 0, 10.0, 28000, 'dairy'),
('INV-009', 'Sua chua', 'kg', 0, 4.0, 45000, 'dairy'),
('INV-010', 'Whey Protein', 'gói', 0, 20, 30000, 'protein'),
('INV-012', 'Sua A2', 'lít', 0, 2, 35000, 'dairy'),
('INV-013', 'Bot dau ha lan', 'kg', 0, 1, 45000, 'protein'),
('INV-014', 'Mat ong', 'lít', 0, 1.0, 120000, 'topping'),
('INV-015', 'Collagen', 'gói', 0, 5, 49000, 'protein'),
('INV-016', 'Yen mach', 'kg', 0, 2, 25000, 'topping'),
('INV-017', 'Hat chia', 'kg', 0, 2, 30000, 'topping'),
('INV-018', 'Dua say', 'kg', 0, 2, 35000, 'topping'),
('INV-019', 'Co ngot', 'kg', 0, 1, 20000, 'topping'),
('INV-020', 'Mat mia', 'lít', 0, 1, 15000, 'topping'),
('INV-021', 'Cha la', 'kg', 0, 1, 40000, 'topping'),
('INV-022', 'Bo hat', 'kg', 0, 2, 55000, 'topping'),
('INV-023', 'Hat dac', 'kg', 0, 1, 35000, 'topping');

-- Create admin account
-- Username: nhondo
-- Password: 123 (hashed)
INSERT INTO employees (id, "fullName", "employeeId", email, phone, "idNumber", "dateOfBirth", address, branch, position, "baseSalary", "startDate", username, password, photo, "customData")
VALUES (
  'ADMIN-001',
  'Nho ndo',
  'ADMIN-001',
  'admin@fitblend.vn',
  '',
  '',
  '2000-01-01',
  '',
  '',
  'admin',
  0,
  NOW()::text,
  'nhondo',
  'scrypt:232b23eb65413ebe955e1d96e02033dc:03a1cbc282afb076b8803385ad3b197422339fa9295562f7d9566bd82d3be46531135b95d5807251664621be3871dbc5365bf53b61db09ff963543abb01f4c34',
  '',
  '{}'
);

-- ✅ Done!
-- Admin: nhondo / 123
-- Database: Fresh & ready for production
