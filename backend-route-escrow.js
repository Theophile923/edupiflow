/**
 * EduPiFlow — Escrow Routes
 * Handles the 48-hour escrow mechanism and 92/5/2/1 distribution.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

const express = require('express');
const router = express.Router();

const ESCROW_HOURS = 48;
const DISTRIBUTION = {
  SCHOOL: 0.92,
  PROMOTER: 0.05,
  SCHOLARSHIP_POOL: 0.02,
  RESERVE: 0.01,
};

// POST /api/escrow/enter
router.post('/enter', async (req, res) => {
  const { paymentId, txid } = req.body;

  if (!paymentId || !txid) {
    return res.status(400).json({ error: 'paymentId and txid are required.' });
  }

  const enteredAt = new Date();
  const releaseAt = new Date(enteredAt.getTime() + ESCROW_HOURS * 60 * 60 * 1000);

  return res.json({
    paymentId,
    txid,
    status: 'in_escrow',
    escrowEnteredAt: enteredAt.toISOString(),
    escrowReleaseAt: releaseAt.toISOString(),
  });
});

// POST /api/escrow/release
router.post('/release', async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required.' });
  }

  try {
    const totalAmount = 1.0; // placeholder — replace with DB value

    const distribution = {
      totalAmount,
      schoolShare: totalAmount * DISTRIBUTION.SCHOOL,
      promoterShare: totalAmount * DISTRIBUTION.PROMOTER,
      scholarshipPoolShare: totalAmount * DISTRIBUTION.SCHOLARSHIP_POOL,
      reserveShare: totalAmount * DISTRIBUTION.RESERVE,
    };

    console.log(`[escrow/release] Payment ${paymentId} released.`);

    return res.json({
      paymentId,
      ...distribution,
      distributedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[escrow/release] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/escrow/dispute
router.post('/dispute', async (req, res) => {
  const { paymentId, reason, raisedBy } = req.body;

  if (!paymentId || !reason || !raisedBy) {
    return res.status(400).json({
      error: 'paymentId, reason, and raisedBy are required.',
    });
  }

  console.log(`[escrow/dispute] Dispute raised on ${paymentId} by ${raisedBy}.`);

  return res.json({
    paymentId,
    status: 'disputed',
    disputedAt: new Date().toISOString(),
    reason,
    raisedBy,
  });
});

// GET /api/escrow/:paymentId
router.get('/:paymentId', async (req, res) => {
  const { paymentId } = req.params;
  return res.status(404).json({
    error: 'Payment not found in escrow.',
    paymentId,
  });
});

module.exports = router;
