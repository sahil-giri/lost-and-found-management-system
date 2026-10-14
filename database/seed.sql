-- Demo data. All three accounts use the password:  Password@123   (change the admin password after first login)
USE lost_and_found;

INSERT INTO users (name, email, password, phone, role) VALUES
('Campus Admin', 'admin@campus.edu',  '$2a$10$zbbt5G2szGpvI/p0h7K34ODezbxd3i0SZs.H0CLDJ9EfResEgPzPa', '9000000001', 'ADMIN'),
('Aarav Sharma', 'aarav@campus.edu',  '$2a$10$zbbt5G2szGpvI/p0h7K34ODezbxd3i0SZs.H0CLDJ9EfResEgPzPa', '9000000002', 'USER'),
('Diya Patil',   'diya@campus.edu',   '$2a$10$zbbt5G2szGpvI/p0h7K34ODezbxd3i0SZs.H0CLDJ9EfResEgPzPa', '9000000003', 'USER');

INSERT INTO items (user_id, title, description, category, type, location, item_date, status) VALUES
(2, 'Black Leather Wallet', 'Black leather wallet containing college ID card.', 'Personal', 'LOST',  'Library', '2026-10-02', 'LOST'),
(3, 'Black Leather Wallet', 'Black leather wallet found near the library entrance.', 'Personal', 'FOUND', 'Library', '2026-10-02', 'FOUND'),
(3, 'Blue Water Bottle',    'Blue steel bottle with a sticker on the side.', 'Accessories', 'FOUND', 'Cafeteria', '2026-10-01', 'FOUND'),
(2, 'Scientific Calculator','Casio fx-991EX left in exam hall 4.', 'Electronics', 'LOST', 'Block B, Hall 4', '2026-09-30', 'LOST');
