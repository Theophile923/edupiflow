/**
 * EduPiFlow — Contract Routes
 * CRUD operations for smart contracts.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

const express = require('express');
const router = express.Router();

// POST /api/contracts
router.post('/', async (req, res) => {
  try {
    const contractData = req.body;
    const required = [
      'parentId', 'schoolId', 'studentId',
      'feeAmountPerPeriod', 'paymentPlan',
      'startDate', 'endDate',
    ];

    for (const field of required) {
      if (!contractData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    const contract = {
      id: `contract_${Date.now()}`,
      ...contractData,
      status: 'draft',
      signedByParent: false,
      signedBySchool: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return res.status(201).json(contract);
  } catch (error) {
    console.error('[contracts/create] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/contracts/:contractId
router.get('/:contractId', async (req, res) => {
  const { contractId } = req.params;
  return res.status(404).json({
    error: 'Contract not found.',
    contractId,
    message: 'Database integration pending.',
  });
});

// POST /api/contracts/:contractId/sign
router.post('/:contractId/sign', async (req, res) => {
  const { contractId } = req.params;
  const { actor } = req.body;

  if (!['parent', 'school'].includes(actor)) {
    return res.status(400).json({ error: 'actor must be "parent" or "school".' });
  }

  console.log(`[contracts/sign] Contract ${contractId} signed by ${actor}.`);

  return res.json({
    contractId,
    signedBy: actor,
    signedAt: new Date().toISOString(),
  });
});

// POST /api/contracts/:contractId/activate
router.post('/:contractId/activate', async (req, res) => {
  const { contractId } = req.params;
  const { depositPaymentId } = req.body;

  if (!depositPaymentId) {
    return res.status(400).json({ error: 'depositPaymentId is required.' });
  }

  console.log(`[contracts/activate] Contract ${contractId} activated.`);

  return res.json({
    contractId,
    status: 'active',
    activatedAt: new Date().toISOString(),
  });
});

// POST /api/contracts/:contractId/opt-out-renewal
router.post('/:contractId/opt-out-renewal', async (req, res) => {
  const { contractId } = req.params;

  console.log(`[contracts/opt-out-renewal] Contract ${contractId} opted out.`);

  return res.json({
    contractId,
    autoRenewal: false,
    optedOutAt: new Date().toISOString(),
  });
});

module.exports = router;
