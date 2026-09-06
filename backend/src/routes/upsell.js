import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res, next) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ recommendations: [] });
    }

    // Prepare parameterized query for IN clause
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
    
    // Fetch upsell rules where base_product_id is in the cart,
    // and join with products to get the suggested product details.
    // Also ensure we only return suggestions where the suggested product's margin >= min_margin_percent
    const result = await query(`
      SELECT DISTINCT ON (u.suggested_product_id)
        u.suggested_product_id as id,
        p.name,
        p.base_price,
        p.category,
        u.co_purchase_score,
        u.is_promoted,
        u.promo_label
      FROM upsell_rules u
      JOIN products p ON p.id = u.suggested_product_id
      WHERE u.base_product_id IN (${placeholders})
        AND p.margin_percent >= u.min_margin_percent
        AND u.suggested_product_id NOT IN (${placeholders})
      ORDER BY u.suggested_product_id, u.co_purchase_score DESC
    `, productIds);

    // Sort globally by co_purchase_score (DESC)
    const sortedRecommendations = result.rows.sort((a, b) => b.co_purchase_score - a.co_purchase_score);

    return res.json({ recommendations: sortedRecommendations });
  } catch (error) {
    return next(error);
  }
});

export default router;
