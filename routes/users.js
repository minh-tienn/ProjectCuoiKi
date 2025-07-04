import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch user profile' 
      });
    }

    // Remove sensitive information
    const { password, ...userProfile } = user;

    res.json({ user: userProfile });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, dateOfBirth, gender, address } = req.body;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        phone,
        date_of_birth: dateOfBirth,
        gender,
        address,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to update profile' 
      });
    }

    const { password, ...userProfile } = updatedUser;

    res.json({
      message: 'Profile updated successfully',
      user: userProfile
    });
  } catch (error) {
    next(error);
  }
});

export default router;