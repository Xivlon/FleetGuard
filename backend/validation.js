const { z } = require('zod');

// Coordinate validation with clamping
const coordinateSchema = z.object({
  latitude: z.number()
    .refine((val) => !isNaN(val), { message: 'Latitude must be a valid number' })
    .refine((val) => val >= -90 && val <= 90, { 
      message: 'Latitude must be between -90 and 90 degrees' 
    }),
  longitude: z.number()
    .refine((val) => !isNaN(val), { message: 'Longitude must be a valid number' })
    .refine((val) => val >= -180 && val <= 180, { 
      message: 'Longitude must be between -180 and 180 degrees' 
    })
});

// Route calculation request schema
const routeCalculationSchema = z.object({
  start: coordinateSchema.optional(),
  end: coordinateSchema,
  vehicleId: z.string().uuid().optional()
}).refine((data) => data.start || data.vehicleId, {
  message: 'Either start coordinates or vehicleId must be provided'
});

// WebSocket vehicle position payload schema
const vehiclePositionSchema = z.object({
  vehicleId: z.string().uuid({ message: 'vehicleId must be a valid UUID' }),
  latitude: z.number()
    .refine((val) => !isNaN(val), { message: 'Latitude must be a valid number' })
    .refine((val) => val >= -90 && val <= 90, { 
      message: 'Latitude must be between -90 and 90 degrees' 
    }),
  longitude: z.number()
    .refine((val) => !isNaN(val), { message: 'Longitude must be a valid number' })
    .refine((val) => val >= -180 && val <= 180, { 
      message: 'Longitude must be between -180 and 180 degrees' 
    }),
  speed: z.number().optional(),
  heading: z.number()
    .refine((val) => !isNaN(val), { message: 'Heading must be a valid number' })
    .refine((val) => val >= 0 && val <= 360, { 
      message: 'Heading must be between 0 and 360 degrees' 
    })
    .optional(),
  timestamp: z.string().optional()
});

// Hazard creation schema
const hazardSchema = z.object({
  type: z.string().min(1, { message: 'Hazard type is required' }),
  location: coordinateSchema,
  description: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  reportedBy: z.string().optional()
});

// Vehicle creation schema
const vehicleSchema = z.object({
  name: z.string().optional(),
  location: coordinateSchema.optional()
});

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map(err => {
          const path = err.path.length > 0 ? err.path.join('.') : 'request';
          return `${path}: ${err.message}`;
        }).join('; ');
        return res.status(400).json({ 
          error: 'Validation failed',
          details: messages
        });
      }
      next(error);
    }
  };
}

/**
 * Validate WebSocket payload
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {Object} data - Data to validate
 * @returns {Object} - { valid: boolean, data?: any, error?: string }
 */
function validateWebSocketPayload(schema, data) {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(err => {
        const path = err.path.length > 0 ? err.path.join('.') : 'payload';
        return `${path}: ${err.message}`;
      }).join('; ');
      return { valid: false, error: messages };
    }
    return { valid: false, error: 'Unknown validation error' };
  }
}

module.exports = {
  coordinateSchema,
  routeCalculationSchema,
  vehiclePositionSchema,
  hazardSchema,
  vehicleSchema,
  validateRequest,
  validateWebSocketPayload
};
