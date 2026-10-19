const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Note = require('../src/models/Note');

jest.setTimeout(120000);

let mongo;
let tokenA;
let tokenB;
let noteA;
let userB;

const auth = (token) => ({ Authorization: ['Bearer', token].join(' ') });
const register = (email) =>
  request(app).post('/api/auth/register').send({ name: 'Test User', email, password: 'password123' });

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  tokenA = (await register('a@example.com')).body.data.token;
  const registrationB = await register('b@example.com');
  tokenB = registrationB.body.data.token;
  userB = registrationB.body.data.user;
  noteA = (await request(app).post('/api/notes').set(auth(tokenA)).send({
    title: 'First note',
    content: 'Private content',
  })).body.data.note;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('protects note routes without a token', async () => {
  expect((await request(app).get('/api/notes')).status).toBe(401);
});

test('returns a healthy status without database access', async () => {
  const response = await request(app).get('/api/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ success: true, message: 'API is running' });
});

test('validates registration, duplicate accounts, login, and invalid tokens', async () => {
  expect((await register('a@example.com')).status).toBe(409);
  expect((await register('invalid-email')).status).toBe(400);
  expect((await request(app).post('/api/auth/login').send({
    email: 'a@example.com',
    password: 'wrong-password',
  })).status).toBe(401);
  expect((await request(app).post('/api/auth/login').send({
    email: 'a@example.com',
    password: 'password123',
  })).status).toBe(200);
  expect((await request(app).get('/api/auth/me').set(auth('invalid'))).status).toBe(401);
});

test('lists only the authenticated user notes and populates owner', async () => {
  const response = await request(app).get('/api/notes').set(auth(tokenA));
  expect(response.status).toBe(200);
  expect(response.body.data.notes).toHaveLength(1);
  expect(response.body.data.notes[0].owner.email).toBe('a@example.com');
  expect(response.body.data.notes[0].owner.password).toBeUndefined();
});

test('populates the current user notes and excludes password hashes', async () => {
  const response = await request(app).get('/api/users/me').set(auth(tokenA));
  expect(response.status).toBe(200);
  expect(response.body.data.user.email).toBe('a@example.com');
  expect(response.body.data.user.notes).toHaveLength(1);
  expect(response.body.data.user.notes[0].owner.toString()).toBe(noteA.owner._id.toString());
  expect(response.body.data.user.password).toBeUndefined();
});

test('rejects cross-user access, updates, archive, restore, and delete operations', async () => {
  const headers = auth(tokenB);
  expect((await request(app).get(`/api/notes/${noteA._id}`).set(headers)).status).toBe(404);
  expect((await request(app).put(`/api/notes/${noteA._id}`).set(headers).send({ title: 'Nope' })).status).toBe(404);
  expect((await request(app).patch(`/api/notes/${noteA._id}/archive`).set(headers)).status).toBe(404);
  expect((await request(app).patch(`/api/notes/${noteA._id}/restore`).set(headers)).status).toBe(404);
  expect((await request(app).delete(`/api/notes/${noteA._id}`).set(headers)).status).toBe(404);
});

test('does not trust a client-supplied owner and validates list parameters', async () => {
  const response = await request(app).post('/api/notes').set(auth(tokenA)).send({
    title: 'Owned note',
    content: 'Still owned by A',
    owner: userB.id,
  });
  expect(response.status).toBe(201);
  expect(response.body.data.note.owner._id).not.toBe(userB.id);
  expect((await request(app).get('/api/notes?page=0').set(auth(tokenA))).status).toBe(400);
  expect((await request(app).get('/api/notes?limit=101').set(auth(tokenA))).status).toBe(400);
});

test('updates, archives, restores, and soft-deletes a note', async () => {
  const headers = auth(tokenA);
  expect((await request(app).put(`/api/notes/${noteA._id}`).set(headers).send({ title: 'Updated' })).body.data.note.title).toBe('Updated');
  expect((await request(app).patch(`/api/notes/${noteA._id}/archive`).set(headers)).body.data.note.isArchived).toBe(true);
  expect((await request(app).patch(`/api/notes/${noteA._id}/restore`).set(headers)).body.data.note.isArchived).toBe(false);
  expect((await request(app).delete(`/api/notes/${noteA._id}`).set(headers)).status).toBe(200);
  expect((await request(app).get('/api/notes').set(headers)).body.data.notes).toHaveLength(1);
  expect((await request(app).patch(`/api/notes/${noteA._id}/restore`).set(headers)).status).toBe(404);
  expect((await Note.findById(noteA._id)).deletedAt).toBeInstanceOf(Date);
  const userNotes = await request(app).get('/api/users/me/notes').set(headers);
  expect(userNotes.body.data.notes).toHaveLength(1);
  expect(userNotes.body.data.notes.some((note) => note._id === noteA._id)).toBe(false);
});

test('rejects malformed IDs and does not expose password hashes', async () => {
  const response = await request(app).get('/api/notes/not-an-id').set(auth(tokenA));
  expect(response.status).toBe(400);
  const user = await User.findOne({ email: 'a@example.com' }).select('+password');
  expect(user.password).toBeTruthy();
  const me = await request(app).get('/api/auth/me').set(auth(tokenA));
  expect(me.body.data.user.password).toBeUndefined();
});
