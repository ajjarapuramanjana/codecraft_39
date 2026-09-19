-- Reference PostgreSQL schema for a future Supabase/PostgreSQL deployment.
CREATE TABLE users (
 id BIGSERIAL PRIMARY KEY,
 name VARCHAR(60) NOT NULL,
 email VARCHAR(254) UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE attempts (
 id BIGSERIAL PRIMARY KEY,
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 scenario_id VARCHAR(80) NOT NULL,
 answer VARCHAR(20) NOT NULL CHECK(answer IN ('Phishing','Suspicious','Legitimate')),
 correct BOOLEAN NOT NULL DEFAULT false,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_time_idx ON attempts(user_id,created_at DESC);
-- For Supabase, use auth.users and Row Level Security rather than this local-app users table.
