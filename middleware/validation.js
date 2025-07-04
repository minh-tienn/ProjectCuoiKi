import Joi from 'joi';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }
    
    next();
  };
};

// Common validation schemas
export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    fullName: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    role: Joi.string().valid('patient', 'doctor').required(),
    dateOfBirth: Joi.date().max('now').required(),
    gender: Joi.string().valid('male', 'female', 'other').required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  appointment: Joi.object({
    doctorId: Joi.string().uuid().required(),
    appointmentDate: Joi.date().min('now').required(),
    appointmentTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    reason: Joi.string().max(500).required(),
    notes: Joi.string().max(1000).optional()
  }),

  consultation: Joi.object({
    appointmentId: Joi.string().uuid().required(),
    diagnosis: Joi.string().max(1000).required(),
    treatment: Joi.string().max(1000).required(),
    prescription: Joi.string().max(2000).optional(),
    notes: Joi.string().max(1000).optional()
  })
};