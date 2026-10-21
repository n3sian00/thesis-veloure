-- Asiakkaan jonotuslistalle liittymishetken kieli ("aika vapautui" -sähköpostia varten)
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'fi';
