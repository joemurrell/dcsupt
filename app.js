const path = require('path');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const {
  normalizeDifficulty,
  normalizeStatus,
  logAudit,
  getAdminModel,
  getPublicPhase,
  requireAdmin
} = require('./db');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toInt(value, fallback = 0) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) ? n : fallback;
}

function createApp(db) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'replace-this-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8
      }
    })
  );

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/auth/session', (req, res) => {
    if (!req.session.user) {
      return res.json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: req.session.user });
  });

  app.post('/api/auth/login', async (req, res) => {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await db.get(
      'SELECT id, username, role, password_hash AS passwordHash FROM users WHERE username = ?',
      username
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    req.session.user = { id: user.id, username: user.username, role: user.role };
    await logAudit(db, user.id, 'login', 'user', user.id, { username: user.username });
    return res.json({ ok: true, user: req.session.user });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const userId = req.session.user?.id || null;
    req.session.destroy(async () => {
      if (userId) {
        await logAudit(db, userId, 'logout', 'user', userId, {});
      }
      res.json({ ok: true });
    });
  });

  app.get('/api/public/phases', async (_req, res) => {
    const phases = await db.all(
      `SELECT id, slug, title, description, order_index AS orderIndex
       FROM sections
       WHERE status = 'published'
       ORDER BY order_index, id`
    );
    res.json({ phases });
  });

  app.get('/api/public/phase/:slug', async (req, res) => {
    const phase = await getPublicPhase(db, req.params.slug);
    if (!phase) {
      return res.status(404).json({ error: 'Phase not found.' });
    }
    return res.json(phase);
  });

  app.get('/api/admin/model', requireAdmin, async (_req, res) => {
    const model = await getAdminModel(db);
    res.json(model);
  });

  app.get('/api/admin/audit-logs', requireAdmin, async (_req, res) => {
    const logs = await db.all(
      `SELECT id, user_id AS userId, action, entity_type AS entityType,
              entity_id AS entityId, detail_json AS detailJson, created_at AS createdAt
       FROM audit_logs
       ORDER BY id DESC
       LIMIT 100`
    );
    res.json({ logs });
  });

  app.post('/api/admin/sections', requireAdmin, async (req, res) => {
    const title = String(req.body.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Section title is required.' });
    }

    const slug = slugify(req.body.slug || title);
    const description = String(req.body.description || '').trim();
    const orderIndex = toInt(req.body.orderIndex);
    const status = normalizeStatus(req.body.status);

    try {
      const result = await db.run(
        `INSERT INTO sections (slug, title, description, order_index, status)
         VALUES (?, ?, ?, ?, ?)`,
        slug,
        title,
        description,
        orderIndex,
        status
      );
      await logAudit(db, req.session.user.id, 'create', 'section', result.lastID, req.body);
      return res.status(201).json({ id: result.lastID });
    } catch (error) {
      return res.status(400).json({ error: 'Section slug already exists.' });
    }
  });

  app.patch('/api/admin/sections/:id', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    const current = await db.get('SELECT * FROM sections WHERE id = ?', id);
    if (!current) return res.status(404).json({ error: 'Section not found.' });

    const title = String(req.body.title ?? current.title).trim();
    const slug = slugify(req.body.slug ?? current.slug);
    const description = String(req.body.description ?? current.description ?? '').trim();
    const orderIndex = toInt(req.body.orderIndex, current.order_index);
    const status = normalizeStatus(req.body.status ?? current.status);

    try {
      await db.run(
        `UPDATE sections
         SET slug = ?, title = ?, description = ?, order_index = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        slug,
        title,
        description,
        orderIndex,
        status,
        id
      );
      await logAudit(db, req.session.user.id, 'update', 'section', id, req.body);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid section update.' });
    }
  });

  app.delete('/api/admin/sections/:id', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    await db.run('DELETE FROM sections WHERE id = ?', id);
    await logAudit(db, req.session.user.id, 'delete', 'section', id, {});
    res.json({ ok: true });
  });

  app.post('/api/admin/learning-paths', requireAdmin, async (req, res) => {
    const title = String(req.body.title || '').trim();
    const sectionId = toInt(req.body.sectionId);
    if (!title || !sectionId) {
      return res.status(400).json({ error: 'sectionId and title are required.' });
    }

    const slug = slugify(req.body.slug || title);
    const description = String(req.body.description || '').trim();
    const orderIndex = toInt(req.body.orderIndex);
    const status = normalizeStatus(req.body.status);

    try {
      const result = await db.run(
        `INSERT INTO learning_paths (section_id, slug, title, description, order_index, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        sectionId,
        slug,
        title,
        description,
        orderIndex,
        status
      );
      await logAudit(db, req.session.user.id, 'create', 'learning_path', result.lastID, req.body);
      return res.status(201).json({ id: result.lastID });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid learning path.' });
    }
  });

  app.patch('/api/admin/learning-paths/:id', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    const current = await db.get('SELECT * FROM learning_paths WHERE id = ?', id);
    if (!current) return res.status(404).json({ error: 'Learning path not found.' });

    const sectionId = toInt(req.body.sectionId, current.section_id);
    const title = String(req.body.title ?? current.title).trim();
    const slug = slugify(req.body.slug ?? current.slug);
    const description = String(req.body.description ?? current.description ?? '').trim();
    const orderIndex = toInt(req.body.orderIndex, current.order_index);
    const status = normalizeStatus(req.body.status ?? current.status);

    try {
      await db.run(
        `UPDATE learning_paths
         SET section_id = ?, slug = ?, title = ?, description = ?, order_index = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        sectionId,
        slug,
        title,
        description,
        orderIndex,
        status,
        id
      );
      await logAudit(db, req.session.user.id, 'update', 'learning_path', id, req.body);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ error: 'Invalid learning path update.' });
    }
  });

  app.delete('/api/admin/learning-paths/:id', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    await db.run('DELETE FROM learning_paths WHERE id = ?', id);
    await logAudit(db, req.session.user.id, 'delete', 'learning_path', id, {});
    res.json({ ok: true });
  });

  app.post('/api/admin/content-items', requireAdmin, async (req, res) => {
    const title = String(req.body.title || '').trim();
    const sectionId = toInt(req.body.sectionId);
    if (!title || !sectionId) {
      return res.status(400).json({ error: 'title and sectionId are required.' });
    }

    const learningPathId = req.body.learningPathId ? toInt(req.body.learningPathId) : null;
    const description = String(req.body.description || '').trim();
    const contentType = String(req.body.contentType || 'video').trim() || 'video';
    const difficulty = normalizeDifficulty(req.body.difficulty);
    const duration = String(req.body.duration || '').trim() || null;
    const externalUrl = String(req.body.externalUrl || '').trim() || null;
    const status = normalizeStatus(req.body.status);
    const orderIndex = toInt(req.body.orderIndex);

    const result = await db.run(
      `INSERT INTO content_items (
        section_id, learning_path_id, title, description, content_type,
        difficulty, duration, external_url, status, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sectionId,
      learningPathId,
      title,
      description,
      contentType,
      difficulty,
      duration,
      externalUrl,
      status,
      orderIndex
    );

    await logAudit(db, req.session.user.id, 'create', 'content_item', result.lastID, req.body);
    res.status(201).json({ id: result.lastID });
  });

  app.patch('/api/admin/content-items/:id', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    const current = await db.get('SELECT * FROM content_items WHERE id = ?', id);
    if (!current) return res.status(404).json({ error: 'Item not found.' });

    const sectionId = toInt(req.body.sectionId, current.section_id);
    const learningPathId = req.body.learningPathId === null
      ? null
      : (req.body.learningPathId !== undefined ? toInt(req.body.learningPathId) : current.learning_path_id);
    const title = String(req.body.title ?? current.title).trim();
    const description = String(req.body.description ?? current.description ?? '').trim();
    const contentType = String(req.body.contentType ?? current.content_type).trim() || 'video';
    const difficulty = normalizeDifficulty(req.body.difficulty ?? current.difficulty);
    const duration = String(req.body.duration ?? current.duration ?? '').trim() || null;
    const externalUrl = String(req.body.externalUrl ?? current.external_url ?? '').trim() || null;
    const status = normalizeStatus(req.body.status ?? current.status);
    const orderIndex = toInt(req.body.orderIndex, current.order_index);

    await db.run(
      `UPDATE content_items
       SET section_id = ?, learning_path_id = ?, title = ?, description = ?, content_type = ?,
           difficulty = ?, duration = ?, external_url = ?, status = ?, order_index = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      sectionId,
      learningPathId,
      title,
      description,
      contentType,
      difficulty,
      duration,
      externalUrl,
      status,
      orderIndex,
      id
    );

    await logAudit(db, req.session.user.id, 'update', 'content_item', id, req.body);
    res.json({ ok: true });
  });

  app.delete('/api/admin/content-items/:id', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    await db.run('DELETE FROM content_items WHERE id = ?', id);
    await logAudit(db, req.session.user.id, 'delete', 'content_item', id, {});
    res.json({ ok: true });
  });

  app.post('/api/admin/content-items/reorder', requireAdmin, async (req, res) => {
    const orderedIds = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : [];
    const sectionId = toInt(req.body.sectionId);
    const learningPathId = req.body.learningPathId === null || req.body.learningPathId === undefined
      ? null
      : toInt(req.body.learningPathId);

    if (!sectionId || orderedIds.length === 0) {
      return res.status(400).json({ error: 'sectionId and orderedIds are required.' });
    }

    await db.exec('BEGIN');
    try {
      for (let i = 0; i < orderedIds.length; i += 1) {
        await db.run(
          `UPDATE content_items
           SET order_index = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND section_id = ? AND (learning_path_id IS ? OR learning_path_id = ?)`,
          i,
          toInt(orderedIds[i]),
          sectionId,
          learningPathId,
          learningPathId
        );
      }
      await db.exec('COMMIT');
      await logAudit(db, req.session.user.id, 'reorder', 'content_item', null, { sectionId, learningPathId, orderedIds });
      return res.json({ ok: true });
    } catch (error) {
      await db.exec('ROLLBACK');
      return res.status(400).json({ error: 'Unable to reorder items.' });
    }
  });

  app.post('/api/admin/content-items/:id/move', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    const sectionId = toInt(req.body.sectionId);
    const learningPathId = req.body.learningPathId === null || req.body.learningPathId === undefined
      ? null
      : toInt(req.body.learningPathId);
    const orderIndex = toInt(req.body.orderIndex);

    if (!id || !sectionId) {
      return res.status(400).json({ error: 'id and sectionId are required.' });
    }

    await db.run(
      `UPDATE content_items
       SET section_id = ?, learning_path_id = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      sectionId,
      learningPathId,
      orderIndex,
      id
    );

    await logAudit(db, req.session.user.id, 'move', 'content_item', id, req.body);
    res.json({ ok: true });
  });

  app.post('/api/admin/content-links', requireAdmin, async (req, res) => {
    const itemId = toInt(req.body.itemId);
    const title = String(req.body.title || '').trim();
    const url = String(req.body.url || '').trim();
    const orderIndex = toInt(req.body.orderIndex);

    if (!itemId || !title || !url) {
      return res.status(400).json({ error: 'itemId, title, and url are required.' });
    }

    const result = await db.run(
      'INSERT INTO content_links (item_id, title, url, order_index) VALUES (?, ?, ?, ?)',
      itemId,
      title,
      url,
      orderIndex
    );

    await logAudit(db, req.session.user.id, 'create', 'content_link', result.lastID, req.body);
    res.status(201).json({ id: result.lastID });
  });

  app.patch('/api/admin/content-links/:id', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    const current = await db.get('SELECT * FROM content_links WHERE id = ?', id);
    if (!current) return res.status(404).json({ error: 'Link not found.' });

    const title = String(req.body.title ?? current.title).trim();
    const url = String(req.body.url ?? current.url).trim();
    const orderIndex = toInt(req.body.orderIndex, current.order_index);

    await db.run(
      `UPDATE content_links
       SET title = ?, url = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      title,
      url,
      orderIndex,
      id
    );

    await logAudit(db, req.session.user.id, 'update', 'content_link', id, req.body);
    res.json({ ok: true });
  });

  app.delete('/api/admin/content-links/:id', requireAdmin, async (req, res) => {
    const id = toInt(req.params.id);
    await db.run('DELETE FROM content_links WHERE id = ?', id);
    await logAudit(db, req.session.user.id, 'delete', 'content_link', id, {});
    res.json({ ok: true });
  });

  app.use('/assets', express.static(path.join(__dirname, 'assets')));
  app.use('/phases', express.static(path.join(__dirname, 'phases')));
  app.use('/resources', express.static(path.join(__dirname, 'resources')));
  app.use('/airframes', express.static(path.join(__dirname, 'airframes')));

  app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
  app.get('/index.html', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
  app.get('/about.html', (_req, res) => res.sendFile(path.join(__dirname, 'about.html')));
  app.get('/admin', (_req, res) => res.redirect('/admin/index.html'));
  app.get('/admin/login.html', (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'login.html')));
  app.get('/admin/index.html', (_req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

module.exports = { createApp };
