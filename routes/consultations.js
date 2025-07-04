import express from 'express';
import { supabase } from '../config/database.js';
import { validate, schemas } from '../middleware/validation.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/consultations:
 *   post:
 *     summary: Create consultation record
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *               diagnosis:
 *                 type: string
 *               treatment:
 *                 type: string
 *               prescription:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Consultation created successfully
 */
router.post('/', authorize('doctor'), validate(schemas.consultation), async (req, res, next) => {
  try {
    const { appointmentId, diagnosis, treatment, prescription, notes } = req.body;
    const doctorId = req.user.id;

    // Verify appointment exists and belongs to doctor
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('doctor_id', doctorId)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({ 
        error: 'Appointment not found' 
      });
    }

    // Create consultation record
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .insert([{
        appointment_id: appointmentId,
        patient_id: appointment.patient_id,
        doctor_id: doctorId,
        diagnosis,
        treatment,
        prescription,
        notes
      }])
      .select()
      .single();

    if (consultationError) {
      return res.status(500).json({ 
        error: 'Failed to create consultation' 
      });
    }

    // Update appointment status to completed
    await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId);

    res.status(201).json({
      message: 'Consultation created successfully',
      consultation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/consultations:
 *   get:
 *     summary: Get user's consultations
 *     tags: [Consultations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Consultations retrieved successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = supabase
      .from('consultations')
      .select(`
        *,
        patient:users!patient_id(id, full_name, email),
        doctor:users!doctor_id(id, full_name, email, specialization)
      `);

    if (userRole === 'patient') {
      query = query.eq('patient_id', userId);
    } else if (userRole === 'doctor') {
      query = query.eq('doctor_id', userId);
    }

    const { data: consultations, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch consultations' 
      });
    }

    res.json({ consultations });
  } catch (error) {
    next(error);
  }
});

export default router;