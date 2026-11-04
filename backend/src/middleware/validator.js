const { z } = require('zod');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'params' ? req.params : (source === 'query' ? req.query : req.body);
      const parsed = schema.parse(data);
      if (source === 'params') req.params = parsed;
      else if (source === 'query') req.query = parsed;
      else req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request payload',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          }
        });
      }
      next(error);
    }
  };
}

const createTicketSchema = z.object({
  customerName: z.string().trim().max(100).optional().nullable(),
  customerReference: z.string().trim().max(50).optional().nullable(),
  subject: z.string().trim().min(1, 'Subject cannot be empty').max(200, 'Subject exceeds 200 characters'),
  description: z.string().trim().min(1, 'Description cannot be empty').max(10000, 'Description exceeds 10000 characters'),
  channel: z.enum(['MANUAL', 'EMAIL', 'PORTAL']).default('MANUAL'),
});

const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'ANALYZING', 'NEEDS_REVIEW', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'RESOLVED', 'FAILED']),
  note: z.string().trim().max(500).optional(),
});

const approveReplySchema = z.object({
  agentNote: z.string().trim().max(1000).optional(),
});

const rejectReplySchema = z.object({
  reason: z.string().trim().min(3, 'Rejection reason is required (min 3 characters)').max(1000),
});

const editReplySchema = z.object({
  text: z.string().trim().min(1, 'Reply text cannot be empty').max(10000),
});

const regenerateReplySchema = z.object({
  promptType: z.enum([
    'ZERO_SHOT',
    'FEW_SHOT',
    'STRUCTURED',
    'INSTRUCTIONAL',
    'CONVERSATIONAL',
    'COT',
    'SELF_CONSISTENCY'
  ]).default('INSTRUCTIONAL'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

module.exports = {
  validate,
  createTicketSchema,
  updateStatusSchema,
  approveReplySchema,
  rejectReplySchema,
  editReplySchema,
  regenerateReplySchema,
  loginSchema,
};

