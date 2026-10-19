const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const protect = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const controller = require('../controllers/notes');

const router = express.Router();
router.use(protect);
router.post('/', requireFields(['title', 'content']), asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.get('/:id', controller.ensureObjectId, asyncHandler(controller.getOne));
router.put('/:id', controller.ensureObjectId, asyncHandler(controller.update));
router.delete('/:id', controller.ensureObjectId, asyncHandler(controller.remove));
router.patch('/:id/archive', controller.ensureObjectId, asyncHandler(controller.archive));
router.patch('/:id/restore', controller.ensureObjectId, asyncHandler(controller.restore));
module.exports = router;
