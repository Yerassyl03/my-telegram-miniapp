-- Создание БД и таблицы логов (если хочешь хранить историю в MySQL)
CREATE DATABASE IF NOT EXISTS cybersafe DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_general_ci;
USE cybersafe;

CREATE TABLE IF NOT EXISTS chat_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_ip VARCHAR(64),
  lang VARCHAR(8),
  message TEXT,
  intent VARCHAR(64),
  reply TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
