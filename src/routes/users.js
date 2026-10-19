const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const protect = require('../middleware/auth');
const controller = require('../controllers/users');

const router = express.Router();
router.use(protect);
router.get('/me', asyncHandler(controller.me));
router.get('/me/notes', asyncHandler(controller.myNotes));
module.exports = router;
