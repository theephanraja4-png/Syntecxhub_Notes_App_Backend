const mongoose = require('mongoose');
const Note = require('../models/Note');
const { AppError } = require('../middleware/errors');

const noteQuery = (req) => ({ _id: req.params.id, owner: req.user._id, deletedAt: null });

const create = async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError('Request body must be a JSON object', 400);
  }
  const { title, content } = req.body;
  if (typeof title !== 'string' || typeof content !== 'string') {
    throw new AppError('Title and content are required', 400);
  }
  const note = await Note.create({ title, content, owner: req.user._id });
  await note.populate({ path: 'owner', select: 'name email' });
  res.status(201).json({ success: true, data: { note } });
};

const list = async (req, res) => {
  const filter = { owner: req.user._id, deletedAt: null };
  if (req.query.archived !== undefined) {
    if (!['true', 'false'].includes(req.query.archived)) {
      throw new AppError('archived must be true or false', 400);
    }
    filter.isArchived = req.query.archived === 'true';
  }
  const page = parsePositiveInteger(req.query.page, 'page', 1);
  const limit = parsePositiveInteger(req.query.limit, 'limit', 20);
  if (limit > 100) throw new AppError('limit must be between 1 and 100', 400);
  const [notes, total] = await Promise.all([
    Note.find(filter).populate('owner', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Note.countDocuments(filter),
  ]);
  res.json({ success: true, data: { notes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
};

const getOne = async (req, res) => {
  const note = await Note.findOne(noteQuery(req)).populate('owner', 'name email');
  if (!note) throw new AppError('Note not found', 404);
  res.json({ success: true, data: { note } });
};

const update = async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError('Request body must be a JSON object', 400);
  }
  const allowed = {};
  if (req.body.title !== undefined) {
    if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
      throw new AppError('title must be a non-empty string', 400);
    }
    allowed.title = req.body.title;
  }
  if (req.body.content !== undefined) {
    if (typeof req.body.content !== 'string' || !req.body.content.trim()) {
      throw new AppError('content must be a non-empty string', 400);
    }
    allowed.content = req.body.content;
  }
  if (req.body.owner !== undefined || req.body.deletedAt !== undefined) {
    throw new AppError('Owner and deletedAt cannot be changed through this endpoint', 400);
  }
  if (!Object.keys(allowed).length) throw new AppError('Provide title or content to update', 400);
  const note = await Note.findOneAndUpdate(noteQuery(req), allowed, {
    new: true,
    runValidators: true,
  }).populate('owner', 'name email');
  if (!note) throw new AppError('Note not found', 404);
  res.json({ success: true, data: { note } });
};

const remove = async (req, res) => {
  const note = await Note.findOneAndUpdate(noteQuery(req), { deletedAt: new Date() }, { new: true });
  if (!note) throw new AppError('Note not found', 404);
  res.json({ success: true, message: 'Note deleted' });
};

const setArchive = (isArchived) => async (req, res) => {
  const note = await Note.findOneAndUpdate(noteQuery(req), { isArchived }, {
    new: true,
    runValidators: true,
  }).populate('owner', 'name email');
  if (!note) throw new AppError('Note not found', 404);
  res.json({ success: true, data: { note } });
};

const ensureObjectId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return next(new AppError('Invalid resource ID', 400));
  next();
};

const parsePositiveInteger = (value, name, defaultValue) => {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new AppError(`${name} must be a positive integer`, 400);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new AppError(`${name} is too large`, 400);
  }
  return parsed;
};

module.exports = { create, list, getOne, update, remove, archive: setArchive(true), restore: setArchive(false), ensureObjectId };
