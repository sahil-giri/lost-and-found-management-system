-- Lost and Found Management System - schema
CREATE DATABASE IF NOT EXISTS lost_and_found CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lost_and_found;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,              -- bcrypt hash, never plain text
  phone       VARCHAR(20) NULL,
  role        ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,                       -- the reporter
  title       VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  category    VARCHAR(50) NOT NULL,
  type        ENUM('LOST','FOUND') NOT NULL,
  location    VARCHAR(150) NOT NULL,
  item_date   DATE NOT NULL,
  image_path  VARCHAR(255) NULL,
  status      ENUM('LOST','FOUND','CLAIMED','RETURNED','CLOSED') NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_items_type_status (type, status),
  INDEX idx_items_category (category),
  INDEX idx_items_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE claims (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  item_id      INT NOT NULL,
  claimant_id  INT NOT NULL,
  message      TEXT NOT NULL,
  status       ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_claims_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_claims_user FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_claim_once (item_id, claimant_id),  -- one claim per user per item
  INDEX idx_claims_item (item_id),
  INDEX idx_claims_claimant (claimant_id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  message          VARCHAR(300) NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  related_item_id  INT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_item FOREIGN KEY (related_item_id) REFERENCES items(id) ON DELETE SET NULL,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;
