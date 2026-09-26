/**
 * EduPiFlow — Auth Routes
 * Server-side verification of Pi access tokens.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

const PI_API = 'https://api.minepi.com/v2';

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header.',
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    const response = await axios.get(`${PI_API}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const pioneer = response.data;

    return res.json({
      uid: pioneer.uid,
      username: pioneer.username,
      wallet_address: pioneer.wallet_address || null,
    });
  } catch (error) {
    console.error('[auth/verify] Error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired Pi access token.',
    });
  }
});

// GET /api/auth/payments/:paymentId
router.get('/payments/:paymentId', async (req, res) => {
  const { paymentId } = req.params;

  try {
    const response = await axios.get(`${PI_API}/payments/${paymentId}`, {
      headers: { Authorization: `Key ${process.env.PI_API_KEY}` },
    });

    return res.json(response.data);
  } catch (error) {
    console.error('[auth/payments] Error:', error.message);
    return res.status(500).json({
      error: 'Payment lookup failed',
      message: error.message,
    });
  }
});

module.exports = router;
