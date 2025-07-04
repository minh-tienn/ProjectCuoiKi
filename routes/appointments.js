import express from 'express';
import { supabase } from '../config/database.js';
import { validate, schemas } from '../middleware/validation.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create a new appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doctorId:
 *                 type: string
 *                 format: uuid
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *               appointmentTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               reason:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post('/', authorize('patient'), validate(schemas.appointment), async (req, res, next) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, reason, notes } = req.body;
    const patientId = req.user.id;

    // Check if doctor exists and is available
    const { data: doctor, error: doctorError } = await supabase
      .from('users')
      .select('*')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();

    if (doctorError || !doctor) {
      return res.status(404).json({ 
        error: 'Doctor not found' 
      });
    }

    // Check for conflicting appointments
    const { data: conflicts, error: conflictError } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .eq('status', 'scheduled');

    if (conflictError) {
      return res.status(500).json({ 
        error: 'Failed to check appointment availability' 
      });
    }

    if (conflicts.length > 0) {
      return res.status(409).json({ 
        error: 'Time slot is already booked' 
      });
    }

    // Create appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([{
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        reason,
        notes,
        status: 'scheduled'
      }])
      .select()
      .single();

    if (appointmentError) {
      return res.status(500).json({ 
        error: 'Failed to create appointment' 
      });
    }

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     summary: Get user's appointments
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointments retrieved successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:users!patient_id(id, full_name, email, phone),
        doctor:users!doctor_id(id, full_name, email, phone)
      `);

    if (userRole === 'patient') {
      query = query.eq('patient_id', userId);
    } else if (userRole === 'doctor') {
      query = query.eq('doctor_id', userId);
    }

    const { data: appointments, error } = await query.order('appointment_date', { ascending: true });

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch appointments' 
      });
    }

    res.json({ appointments });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     summary: Update appointment status
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, confirmed, completed, cancelled]
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *       404:
 *         description: Appointment not found
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status' 
      });
    }

    // Check if appointment exists and user has permission
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ 
        error: 'Appointment not found' 
      });
    }

    // Check permission
    if (appointment.patient_id !== userId && appointment.doctor_id !== userId) {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ 
        error: 'Failed to update appointment' 
      });
    }

    res.json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    next(error);
  }
});

export default router;