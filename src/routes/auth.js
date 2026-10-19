const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const protect = require('../middleware/auth');
const controller = require('../controllers/auth');

const router = express.Router();
router.post('/register', asyncHandler(controller.register));
router.post('/login', asyncHandler(controller.login));
router.get('/me', protect, asyncHandler(controller.me));
module.exports = router;
