import express from 'express';
import { supabase } from '../config/database.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctors retrieved successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const { data: doctors, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone, specialization, experience, rating, available')
      .eq('role', 'doctor')
      .eq('available', true);

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch doctors' 
      });
    }

    res.json({ doctors });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/doctors/{id}:
 *   get:
 *     summary: Get doctor details
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Doctor details retrieved successfully
 *       404:
 *         description: Doctor not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: doctor, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone, specialization, experience, rating, available, bio')
      .eq('id', id)
      .eq('role', 'doctor')
      .single();

    if (error || !doctor) {
      return res.status(404).json({ 
        error: 'Doctor not found' 
      });
    }

    res.json({ doctor });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/doctors/availability:
 *   put:
 *     summary: Update doctor availability
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       403:
 *         description: Access denied
 */
router.put('/availability', authorize('doctor'), async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const { available } = req.body;

    const { data: updatedDoctor, error } = await supabase
      .from('users')
      .update({ available })
      .eq('id', doctorId)
      .select('id, full_name, available')
      .single();

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to update availability' 
      });
    }

    res.json({
      message: 'Availability updated successfully',
      doctor: updatedDoctor
    });
  } catch (error) {
    next(error);
  }
});

export default router;