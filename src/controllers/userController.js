// src/controllers/userController.js
// API handler layer (Express-style) for users.
// Exports handlers you can mount on a router, e.g. router.get('/', listUsers)

const userService = require('../services/userService');

async function listUsers(req, res, next) {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const id = req.params.id;
    const user = await userService.getUser(id);
    res.json(user);
  } catch (err) {
    if (err.message === 'User not found') return res.status(404).json({ error: err.message });
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const created = await userService.createUser(req.body);
    res.status(201).json(created);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await userService.updateUser(id, req.body);
    res.json(updated);
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    if (err.status === 404) return res.status(404).json({ error: err.message });
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const id = req.params.id;
    await userService.deleteUser(id);
    res.status(204).end();
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
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
