# Database Migration Order

## 1) Create database

Use PostgreSQL 14+ and create an empty database.

Example:

psql -U postgres -c "CREATE DATABASE chakravyuh_event;"

## 2) Apply schema

From project root:

psql -U postgres -d chakravyuh_event -f server/db/schema.sql

## 3) Create first admin user

Generate bcrypt hash for your admin password and insert one row:

INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2a$10$replace_with_real_bcrypt_hash');

## 4) Seed teams (optional)

Insert teams and corresponding progress rows:

INSERT INTO teams (name, access_code) VALUES ('Cyber Wolves', 'TEAM001') RETURNING id;

Then:

INSERT INTO team_level_progress (team_id)
VALUES ('<returned_team_uuid>');

## 5) Verify core records

- event_config must have exactly one row with id = 1
- powerup_definitions must contain 5 rows

Quick checks:

SELECT COUNT(*) FROM event_config;
SELECT COUNT(*) FROM powerup_definitions;
