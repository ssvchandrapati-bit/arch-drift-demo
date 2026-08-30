// src/controllers/userController.js
// API handler layer that calls the DB layer directly (bypasses services)

const db = require('../db/users');

function validateUserPayload(data) {
  if (!data || typeof data !== 'object') return 'Invalid payload';
  if (!data.name || typeof data.name !== 'string') return 'Missing or invalid name';
  if (!data.email || typeof data.email !== 'string') return 'Missing or invalid email';
  return null;
}

async function listUsers(req, res, next) {
  try {
    const users = await db.getAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const id = req.params.id;
    const user = await db.getById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const errMsg = validateUserPayload(req.body);
    if (errMsg) return res.status(400).json({ error: errMsg });
    const created = await db.create({ name: req.body.name, email: req.body.email });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const id = req.params.id;
    const patch = req.body || {};
    if (patch.name && typeof patch.name !== 'string') return res.status(400).json({ error: 'Invalid name' });
    if (patch.email && typeof patch.email !== 'string') return res.status(400).json({ error: 'Invalid email' });
    const updated = await db.update(id, patch);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const id = req.params.id;
    const ok = await db.remove(id);
    if (!ok) return res.status(404).json({ error: 'User not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
