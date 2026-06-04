const path = require('path');
const os = require('os');
const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const dbFile = path.join(os.tmpdir(), `dcsupt-test-${Date.now()}.sqlite`);
process.env.DATABASE_PATH = dbFile;
process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'admin123!';

const { initializeDatabase } = require('../db');
const { createApp } = require('../app');

let db;
let app;

test.before(async () => {
  db = await initializeDatabase();
  app = createApp(db);
});

test.after(async () => {
  if (db) await db.close();
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
});

test('admin routes reject unauthenticated users', async () => {
  const response = await request(app).get('/api/admin/model');
  assert.equal(response.status, 401);
});

test('admin login and CRUD flow', async () => {
  const agent = request.agent(app);

  const login = await agent
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123!' });
  assert.equal(login.status, 200);

  const createSection = await agent
    .post('/api/admin/sections')
    .send({ title: 'Test Section', slug: 'test-section', orderIndex: 99, status: 'published' });
  assert.equal(createSection.status, 201);
  const sectionId = createSection.body.id;

  const createPath = await agent
    .post('/api/admin/learning-paths')
    .send({ sectionId, title: 'Test Path', slug: 'test-path', orderIndex: 0, status: 'published' });
  assert.equal(createPath.status, 201);
  const learningPathId = createPath.body.id;

  const createItem = await agent
    .post('/api/admin/content-items')
    .send({
      sectionId,
      learningPathId,
      title: 'Test Item',
      description: 'Test Description',
      contentType: 'video',
      difficulty: 'beginner',
      duration: '10:00',
      externalUrl: 'https://example.com',
      status: 'published',
      orderIndex: 0
    });
  assert.equal(createItem.status, 201);
  const itemId = createItem.body.id;

  const updateItem = await agent
    .patch(`/api/admin/content-items/${itemId}`)
    .send({ title: 'Updated Item', status: 'draft' });
  assert.equal(updateItem.status, 200);

  const reorder = await agent
    .post('/api/admin/content-items/reorder')
    .send({ sectionId, learningPathId, orderedIds: [itemId] });
  assert.equal(reorder.status, 200);

  const publicPhase = await request(app).get('/api/public/phase/test-section');
  assert.equal(publicPhase.status, 200);
  assert.equal(publicPhase.body.section.slug, 'test-section');

  const deleteItem = await agent.delete(`/api/admin/content-items/${itemId}`);
  assert.equal(deleteItem.status, 200);

  const logout = await agent.post('/api/auth/logout');
  assert.equal(logout.status, 200);
});
