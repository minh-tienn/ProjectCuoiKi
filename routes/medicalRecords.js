import express from 'express';
import { supabase } from '../config/database.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/medical-records:
 *   get:
 *     summary: Get patient's medical records
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Medical records retrieved successfully
 */
router.get('/', authorize('patient'), async (req, res, next) => {
  try {
    const patientId = req.user.id;

    const { data: medicalRecords, error } = await supabase
      .from('medical_records')
      .select(`
        *,
        doctor:users!doctor_id(full_name, specialization)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch medical records' 
      });
    }

    res.json({ medicalRecords });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/medical-records:
 *   post:
 *     summary: Create medical record
 *     tags: [Medical Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               recordType:
 *                 type: string
 *                 enum: [consultation, lab_result, prescription, diagnosis]
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Medical record created successfully
 */
router.post('/', authorize('doctor'), async (req, res, next) => {
  try {
    const { patientId, recordType, title, content, attachments } = req.body;
    const doctorId = req.user.id;

    const { data: medicalRecord, error } = await supabase
      .from('medical_records')
      .insert([{
        patient_id: patientId,
        doctor_id: doctorId,
        record_type: recordType,
        title,
        content,
        attachments
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to create medical record' 
      });
    }

    res.status(201).json({
      message: 'Medical record created successfully',
      medicalRecord
    });
  } catch (error) {
    next(error);
  }
});

export default router;