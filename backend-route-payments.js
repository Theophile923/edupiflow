/**
 * EduPiFlow — Payment Routes
 * Server-side approval and completion of Pi payments.
 *
 * PAYMENT POLICY: All payments are settled exclusively in Pi Coin.
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

const PI_API = 'https://api.minepi.com/v2';

// POST /api/payments/approve
router.post('/approve', async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required.' });
  }

  try {
    const response = await axios.post(
      `${PI_API}/payments/${paymentId}/approve`,
      {},
      { headers: { Authorization: `Key ${process.env.PI_API_KEY}` } }
    );

    console.log(`[payments/approve] Payment ${paymentId} approved.`);
    return res.json(response.data);
  } catch (error) {
    console.error('[payments/approve] Error:', error.message);
    return res.status(500).json({
      error: 'Approval failed',
      message: error.response?.data?.message || error.message,
    });
  }
});

// POST /api/payments/complete
router.post('/complete', async (req, res) => {
  const { paymentId, txid } = req.body;

  if (!paymentId || !txid) {
    return res.status(400).json({
      error: 'paymentId and txid are required.',
    });
  }

  try {
    const response = await axios.post(
      `${PI_API}/payments/${paymentId}/complete`,
      { txid },
      { headers: { Authorization: `Key ${process.env.PI_API_KEY}` } }
    );

    console.log(`[payments/complete] Payment ${paymentId} completed.`);

    return res.json(response.data);
  } catch (error) {
    console.error('[payments/complete] Error:', error.message);
    return res.status(500).json({
      error: 'Completion failed',
      message: error.response?.data?.message || error.message,
    });
  }
});

// POST /api/payments/incomplete
router.post('/incomplete', async (req, res) => {
  const { paymentId, action, txid } = req.body;

  if (!paymentId || !['complete', 'cancel'].includes(action)) {
    return res.status(400).json({
      error: 'paymentId and valid action (complete/cancel) are required.',
    });
  }

  try {
    if (action === 'complete') {
      if (!txid) {
        return res.status(400).json({ error: 'txid is required for completion.' });
      }
      const response = await axios.post(
        `${PI_API}/payments/${paymentId}/complete`,
        { txid },
        { headers: { Authorization: `Key ${process.env.PI_API_KEY}` } }
      );
      return res.json(response.data);
    }

    await axios.post(
      `${PI_API}/payments/${paymentId}/cancel`,
      {},
      { headers: { Authorization: `Key ${process.env.PI_API_KEY}` } }
    );
    return res.json({ status: 'cancelled' });
  } catch (error) {
    console.error('[payments/incomplete] Error:', error.message);
    return res.status(500).json({
      error: 'Incomplete payment resolution failed',
      message: error.message,
    });
  }
});

// POST /api/payments/offline-sync
router.post('/offline-sync', async (req, res) => {
  const payment = req.body;

  if (!payment || !payment.id) {
    return res.status(400).json({ error: 'Invalid offline payment data.' });
  }

  console.log(`[payments/offline-sync] Received offline payment ${payment.id}`);
  return res.json({
    status: 'queued',
    paymentId: payment.id,
    receivedAt: new Date().toISOString(),
  });
});

module.exports = router;
