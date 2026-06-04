const path = require('path');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { phaseSeed } = require('./seedData');

function normalizeDifficulty(value) {
  const v = (value || '').toLowerCase();
  if (['beginner', 'intermediate', 'advanced'].includes(v)) return v;
  return 'beginner';
}

function normalizeStatus(value) {
  const v = (value || '').toLowerCase();
  return v === 'draft' ? 'draft' : 'published';
}

async function logAudit(db, userId, action, entityType, entityId, details) {
  await db.run(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, detail_json)
     VALUES (?, ?, ?, ?, ?)`,
    userId || null,
    action,
    entityType,
    entityId || null,
    JSON.stringify(details || {})
  );
}

async function initializeDatabase() {
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'dcsupt.sqlite');
  const fs = require('fs');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON;');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learning_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(section_id, slug),
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER NOT NULL,
      learning_path_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      content_type TEXT NOT NULL DEFAULT 'video',
      difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
      duration TEXT,
      external_url TEXT,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS content_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      detail_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
  const existingUser = await db.get('SELECT id FROM users WHERE username = ?', adminUsername);
  if (!existingUser) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', adminUsername, hash, 'admin');
  }

  const sectionCount = await db.get('SELECT COUNT(*) AS count FROM sections');
  if (!sectionCount || sectionCount.count === 0) {
    for (const section of phaseSeed) {
      const sectionResult = await db.run(
        `INSERT INTO sections (slug, title, description, order_index, status)
         VALUES (?, ?, ?, ?, 'published')`,
        section.slug,
        section.title,
        section.description,
        section.order
      );

      let itemOrder = 0;
      for (const learningPath of section.paths) {
        const pathResult = await db.run(
          `INSERT INTO learning_paths (section_id, slug, title, description, order_index, status)
           VALUES (?, ?, ?, ?, ?, 'published')`,
          sectionResult.lastID,
          learningPath.slug,
          learningPath.title,
          learningPath.description,
          learningPath.order
        );

        for (const item of learningPath.items) {
          await db.run(
            `INSERT INTO content_items (
              section_id, learning_path_id, title, description, content_type,
              difficulty, duration, external_url, status, order_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            sectionResult.lastID,
            pathResult.lastID,
            item.title,
            item.description,
            item.contentType || 'video',
            normalizeDifficulty(item.difficulty),
            item.duration || null,
            item.externalUrl || null,
            normalizeStatus(item.status),
            itemOrder++
          );
        }
      }
    }
  }

  return db;
}

async function getAdminModel(db) {
  const sections = await db.all(
    'SELECT id, slug, title, description, order_index AS orderIndex, status FROM sections ORDER BY order_index, id'
  );
  const paths = await db.all(
    'SELECT id, section_id AS sectionId, slug, title, description, order_index AS orderIndex, status FROM learning_paths ORDER BY section_id, order_index, id'
  );
  const items = await db.all(
    `SELECT id, section_id AS sectionId, learning_path_id AS learningPathId, title, description,
            content_type AS contentType, difficulty, duration, external_url AS externalUrl,
            status, order_index AS orderIndex
     FROM content_items
     ORDER BY section_id, learning_path_id, order_index, id`
  );
  const links = await db.all(
    'SELECT id, item_id AS itemId, title, url, order_index AS orderIndex FROM content_links ORDER BY item_id, order_index, id'
  );

  return { sections, learningPaths: paths, contentItems: items, contentLinks: links };
}

async function getPublicPhase(db, slug) {
  const section = await db.get(
    `SELECT id, slug, title, description, order_index AS orderIndex
     FROM sections
     WHERE slug = ? AND status = 'published'`,
    slug
  );
  if (!section) return null;

  const learningPaths = await db.all(
    `SELECT id, section_id AS sectionId, slug, title, description, order_index AS orderIndex
     FROM learning_paths
     WHERE section_id = ? AND status = 'published'
     ORDER BY order_index, id`,
    section.id
  );

  const items = await db.all(
    `SELECT id, section_id AS sectionId, learning_path_id AS learningPathId, title, description,
            content_type AS contentType, difficulty, duration, external_url AS externalUrl,
            status, order_index AS orderIndex
     FROM content_items
     WHERE section_id = ? AND status = 'published'
     ORDER BY learning_path_id, order_index, id`,
    section.id
  );

  const links = await db.all(
    `SELECT cl.id, cl.item_id AS itemId, cl.title, cl.url, cl.order_index AS orderIndex
     FROM content_links cl
     JOIN content_items ci ON ci.id = cl.item_id
     WHERE ci.section_id = ? AND ci.status = 'published'
     ORDER BY cl.item_id, cl.order_index, cl.id`,
    section.id
  );

  return { section, learningPaths, items, links };
}

function requireAdmin(req, res, next) {
  if (!req.session?.user || req.session.user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = {
  initializeDatabase,
  normalizeDifficulty,
  normalizeStatus,
  logAudit,
  getAdminModel,
  getPublicPhase,
  requireAdmin
};
