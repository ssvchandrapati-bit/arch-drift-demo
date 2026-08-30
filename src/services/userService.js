// src/services/userService.js
// Simple business-logic layer for users.
// Uses the abstract DB layer at ../db/users.js

const db = require('../db/users');

function validateUserData(data) {
  if (!data || typeof data !== 'object') return 'Invalid payload';
  if (!data.name || typeof data.name !== 'string') return 'Missing or invalid name';
  if (!data.email || typeof data.email !== 'string') return 'Missing or invalid email';
  return null;
}

async function listUsers() {
  return db.getAll();
}

async function getUser(id) {
  if (!id) throw new Error('id is required');
  const user = await db.getById(id);
  if (!user) throw new Error('User not found');
  return user;
}

async function createUser(data) {
  const err = validateUserData(data);
  if (err) {
    const e = new Error(err);
    e.status = 400;
    throw e;
  }
  const newUser = await db.create({ name: data.name, email: data.email });
  return newUser;
}

async function updateUser(id, patch) {
  if (!id) throw new Error('id is required');
  // allow partial updates but validate types if present
  if (patch.name && typeof patch.name !== 'string') {
    const e = new Error('Invalid name');
    e.status = 400;
    throw e;
  }
  if (patch.email && typeof patch.email !== 'string') {
    const e = new Error('Invalid email');
    e.status = 400;
    throw e;
  }
  const updated = await db.update(id, patch);
  if (!updated) {
    const e = new Error('User not found');
    e.status = 404;
    throw e;
  }
  return updated;
}

async function deleteUser(id) {
  if (!id) throw new Error('id is required');
  const ok = await db.remove(id);
  if (!ok) {
    const e = new Error('User not found');
    e.status = 404;
    throw e;
  }
  return ok;
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
