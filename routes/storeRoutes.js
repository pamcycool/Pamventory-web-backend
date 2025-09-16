import express from 'express';
import {
  createStore,
  getUserStores,
  getStore,
  updateStore,
  deleteStore,
  setActiveStore,
  getActiveStore
} from '../controllers/storeController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Store CRUD operations
router.post('/', createStore);
router.get('/', getUserStores);
router.get('/active', getActiveStore);
router.put('/set-active', setActiveStore);
router.get('/:storeId', getStore);
router.put('/:storeId', updateStore);
router.delete('/:storeId', deleteStore);

// Store management


export default router;
