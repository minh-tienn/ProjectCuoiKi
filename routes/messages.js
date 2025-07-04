import express from 'express';
import { supabase } from '../config/database.js';

const router = express.Router();

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get messages between users
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const { otherUserId } = req.query;
    const currentUserId = req.user.id;

    if (!otherUserId) {
      return res.status(400).json({ 
        error: 'otherUserId is required' 
      });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(full_name),
        receiver:users!receiver_id(full_name)
      `)
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to fetch messages' 
      });
    }

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *                 format: uuid
 *               message:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post('/', async (req, res, next) => {
  try {
    const { receiverId, message, messageType = 'text' } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !message) {
      return res.status(400).json({ 
        error: 'receiverId and message are required' 
      });
    }

    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: senderId,
        receiver_id: receiverId,
        message,
        message_type: messageType
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ 
        error: 'Failed to send message' 
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    next(error);
  }
});

export default router;