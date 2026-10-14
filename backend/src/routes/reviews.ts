import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { broadcastEvent } from '../websocket/wsServer';

const router = Router();

// GET /api/reviews - Retrieve all review comments and aggregate stats
router.get('/', async (req: Request, res: Response) => {
  try {
    const reviews = await databaseService.getReviews();
    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
        : 5.0;

    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const categoryCounts: Record<string, number> = {};

    reviews.forEach((r) => {
      const rounded = Math.round(r.rating);
      if (ratingDistribution[rounded] !== undefined) {
        ratingDistribution[rounded]++;
      }
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        reviews,
        stats: {
          totalReviews,
          avgRating,
          ratingDistribution,
          categoryCounts,
          isLivePostgres: databaseService.getMetrics().isRealPostgres,
        },
      },
    });
  } catch (err: any) {
    console.error('Error fetching reviews:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reviews', message: err?.message });
  }
});

// POST /api/reviews - Submit a new review comment and store in DB
router.post('/', async (req: Request, res: Response) => {
  try {
    const { author_name, author_email, rating, category, title, comment } = req.body;

    if (!author_name || !title || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Validation error: author_name, title, and comment are required.',
      });
    }

    const review = await databaseService.addReview({
      author_name: String(author_name).trim(),
      author_email: String(author_email || 'guest@sysdesign.io').trim(),
      rating: Number(rating) || 5,
      category: String(category || 'General').trim(),
      title: String(title).trim(),
      comment: String(comment).trim(),
    });

    // Broadcast live event to any open browser sessions
    broadcastEvent('new_review', {
      type: 'new_review',
      review,
      timestamp: Date.now(),
    });

    return res.status(201).json({
      success: true,
      message: 'Review stored in database successfully',
      data: review,
    });
  } catch (err: any) {
    console.error('Error adding review:', err);
    return res.status(500).json({ success: false, error: 'Failed to save review', message: err?.message });
  }
});

// DELETE /api/reviews/:id - Remove a review
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'Invalid review ID' });
    }

    const success = await databaseService.deleteReview(id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Review not found' });
    }

    broadcastEvent('delete_review', {
      type: 'delete_review',
      reviewId: id,
      timestamp: Date.now(),
    });

    return res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting review:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete review', message: err?.message });
  }
});

export default router;
