import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All transaction endpoints require authentication
router.use(requireAuth);

router.post('/', TransactionController.addTransaction);
router.get('/', TransactionController.getTransactions);
router.patch('/:id', TransactionController.updateTransaction);
router.delete('/:id', TransactionController.deleteTransaction);
router.get('/analytics/category-totals', TransactionController.getCategoryTotals);

export default router;
