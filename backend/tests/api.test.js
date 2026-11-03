const request = require('supertest');
const app = require('../src/app');
const { runMigrations } = require('../src/db/migrate');
const { seedDatabase } = require('../src/db/seed');
const { closeDb } = require('../src/db/connection');

let authToken = '';

beforeAll(() => {
  runMigrations();
  seedDatabase();
});

afterAll(() => {
  closeDb();
});

describe('SupportIQ Express API Gateway Integration Tests', () => {
  test('GET /api/v1/health should return ok', async () => {
    const res = await request(app).get('/api/v1/health');
    assertStatus(res, 200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('supportiq-backend');
  });

  test('TC-18: Protected endpoint without auth should return 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/tickets');
    assertStatus(res, 401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('POST /api/v1/auth/login should authenticate agent and return token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'agent@supportiq.local',
        password: 'AgentSecurePass2026!',
      });
    assertStatus(res, 200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('agent@supportiq.local');
    authToken = res.body.data.token;
  });

  test('TC-05: POST /api/v1/tickets with blank description should fail validation', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        subject: 'Valid Subject',
        description: '   ',
      });
    assertStatus(res, 400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('TC-01: POST /api/v1/tickets should create ticket and return code', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customerName: 'Integration Tester',
        customerReference: 'TEST-99',
        subject: 'Need help unlocking my card after PIN block',
        description: 'I entered my PIN wrong three times at the store terminal. Please reset it.',
        channel: 'MANUAL',
      });
    assertStatus(res, 201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.ticketCode).toMatch(/^SUP-\d{4}-\d{6}$/);
    expect(res.body.data.status).toBe('NEW');
  });

  test('GET /api/v1/tickets should list tickets with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${authToken}`);
    assertStatus(res, 200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  test('GET /api/v1/tickets/:id should return ticket details, analysis, and reply', async () => {
    const res = await request(app)
      .get('/api/v1/tickets/1')
      .set('Authorization', `Bearer ${authToken}`);
    assertStatus(res, 200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(1);
    expect(res.body.data.subject).toBeDefined();
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });

  test('TC-11: POST /api/v1/replies/:replyId/approve should approve reply with sent=false', async () => {
    const res = await request(app)
      .post('/api/v1/replies/1/approve')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        agentNote: 'Approved for customer response.',
      });
    assertStatus(res, 200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.sent).toBe(false); // Non-negotiable human review boundary
  });

  test('TC-13: PATCH /api/v1/replies/:replyId on approved reply should revoke approval', async () => {
    const res = await request(app)
      .patch('/api/v1/replies/1')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        text: 'Edited text after approval. Should revoke approved status back to NEEDS_REVIEW.',
      });
    assertStatus(res, 200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('NEEDS_REVIEW');
    expect(res.body.data.current_text).toContain('Edited text');
  });

  test('TC-12: POST /api/v1/replies/:replyId/reject should require reason and set status REJECTED', async () => {
    // Missing reason should fail
    const failRes = await request(app)
      .post('/api/v1/replies/1/reject')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: '' });
    assertStatus(failRes, 400);

    // Valid rejection
    const res = await request(app)
      .post('/api/v1/replies/1/reject')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        reason: 'Tone is too informal for our banking policy guidelines.',
      });
    assertStatus(res, 200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REJECTED');
  });

  test('GET /api/v1/analytics/overview and distributions should return calculated metrics', async () => {
    const overviewRes = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${authToken}`);
    assertStatus(overviewRes, 200);
    expect(overviewRes.body.data.total).toBeGreaterThan(0);

    const distRes = await request(app)
      .get('/api/v1/analytics/distributions')
      .set('Authorization', `Bearer ${authToken}`);
    assertStatus(distRes, 200);
    expect(distRes.body.data.status).toBeDefined();
    expect(distRes.body.data.priority).toBeDefined();
  });
});

function assertStatus(res, expected) {
  if (res.status !== expected) {
    throw new Error(`Expected status ${expected}, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
}
