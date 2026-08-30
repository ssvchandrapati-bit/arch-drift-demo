// src/db/users.js
// Simple in-memory abstract database layer for users. This is a stub that mimics async DB operations.

let users = [];
let nextId = 1;

async function getAll() {
  // simulate async DB access
  return users.slice();
}

async function getById(id) {
  return users.find(u => u.id === Number(id)) || null;
}

async function create(user) {
  const newUser = Object.assign({}, user, { id: nextId++ });
  users.push(newUser);
  return newUser;
}

async function update(id, patch) {
  const idx = users.findIndex(u => u.id === Number(id));
  if (idx === -1) return null;
  users[idx] = Object.assign({}, users[idx], patch, { id: users[idx].id });
  return users[idx];
}

async function remove(id) {
  const idx = users.findIndex(u => u.id === Number(id));
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
}

// For testing/demo purposes, seed a couple users
users.push({ id: nextId++, name: 'Alice Example', email: 'alice@example.com' });
users.push({ id: nextId++, name: 'Bob Example', email: 'bob@example.com' });

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
