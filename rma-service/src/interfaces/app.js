import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import * as OpenApiValidator from 'express-openapi-validator';
import { RmaService } from '../application/rma.js';
import { Problem, etag, fail, page } from '../domain/rules.js';

const contract = YAML.parse(readFileSync(fileURLToPath(new URL('../../../openapi-rma.yaml', import.meta.url)), 'utf8'));
contract.servers = [{ url: '/' }];

export function createApp(store, config) {
  const app = express();
  const service = new RmaService(store);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, exposedHeaders: ['ETag', 'Location', 'X-Correlation-Id'] }));
  app.use(express.json({ limit: '128kb' }));
  app.use((req, res, next) => {
    req.correlationId = req.get('X-Correlation-Id') || randomUUID();
    res.set('X-Correlation-Id', req.correlationId);
    next();
  });
  app.use('/api/v1/auth/token', rateLimit({ windowMs: 60000, limit: 20, standardHeaders: true, legacyHeaders: false, handler: (req, res) => res.status(429).type('application/problem+json').json({ type: 'https://api.banco.example/problems/rate-limit', title: 'Demasiadas solicitudes', status: 429, businessCode: 'RATE_LIMITED', correlationId: req.correlationId }) }));
  app.use((req, res, next) => {
    try {
      if (req.path === '/api/v1/auth/token' && req.method === 'POST') return next();
      const authorization = req.get('Authorization');
      if (!authorization?.startsWith('Bearer ')) fail(401, 'UNAUTHORIZED', 'Se requiere un token Bearer.');
      try { req.identity = jwt.verify(authorization.slice(7), config.jwtSecret, { algorithms: ['HS256'], issuer: config.jwtIssuer, audience: config.jwtAudience }); }
      catch { fail(401, 'UNAUTHORIZED', 'El token es inválido o expiró.'); }
      if (!Array.isArray(req.identity.roles) || typeof req.identity.sub !== 'string') fail(401, 'UNAUTHORIZED', 'El token no contiene una identidad válida.');
      if (['PUT', 'DELETE'].includes(req.method) || (req.method === 'POST' && /\/(approval|rejection)$/.test(req.path))) {
        if (!req.get('If-Match')) fail(428, 'PRECONDITION_REQUIRED', 'Se requiere If-Match.');
      }
      next();
    } catch (error) { next(error); }
  });
  app.use(OpenApiValidator.middleware({ apiSpec: contract, validateRequests: true, validateResponses: false, validateSecurity: false }));

  const roles = (...allowed) => (req, res, next) => {
    if (!req.identity.roles.some(role => allowed.includes(role))) return next(new Problem(403, 'FORBIDDEN', 'El usuario no tiene permisos para esta operación.'));
    next();
  };
  const context = req => ({ actor: req.identity.sub, roles: req.identity.roles, correlationId: req.correlationId, match: req.get('If-Match'), key: req.get('Idempotency-Key'), body: req.body });
  const sendCreated = (res, result) => res.set(result.headers).status(result.status).json(result.body);
  const sendResource = (req, res, value) => {
    const tag = etag(value);
    res.set('ETag', tag);
    if (req.get('If-None-Match') === tag) return res.status(304).end();
    return res.json(value);
  };
  const adminReaders = roles('MAKER', 'CHECKER', 'ADMIN', 'AUDITOR');
  const writers = roles('MAKER', 'ADMIN');

  const dummyHash = argon2.hash('placeholder-for-unknown-user');
  app.post('/api/v1/auth/token', async (req, res) => {
    const user = await service.repo('users').findOne({ username: req.body.username });
    const valid = await argon2.verify(user?.passwordHash ?? await dummyHash, req.body.password);
    if (!user || !valid) fail(401, 'UNAUTHORIZED', 'Credenciales inválidas.');
    const accessToken = jwt.sign({ roles: user.roles }, config.jwtSecret, { subject: user.username, issuer: config.jwtIssuer, audience: config.jwtAudience, expiresIn: config.jwtExpiresIn, algorithm: 'HS256' });
    res.json({ accessToken, tokenType: 'Bearer', expiresIn: config.jwtExpiresIn, roles: user.roles });
  });

  app.get('/api/v1/parameters', adminReaders, async (req, res) => {
    await service.synchronizeAll();
    const filter = Object.fromEntries(['code', 'category', 'businessDomain', 'status'].filter(key => req.query[key]).map(key => [key, req.query[key]]));
    res.json(await service.list('parameters', filter, req.query, 'code,asc'));
  });
  app.post('/api/v1/parameters', writers, async (req, res) => sendCreated(res, await service.createParameter(req.body, context(req))));
  app.get('/api/v1/parameters/:id', adminReaders, async (req, res) => {
    await store.transaction(session => service.synchronize(req.params.id, session));
    sendResource(req, res, await service.find('parameters', req.params.id));
  });
  app.put('/api/v1/parameters/:id', writers, async (req, res) => sendResource(req, res, await service.updateParameter(req.params.id, req.body, context(req))));
  app.delete('/api/v1/parameters/:id', writers, async (req, res) => { await service.retireParameter(req.params.id, context(req)); res.status(204).end(); });

  app.get('/api/v1/change-requests', adminReaders, async (req, res) => {
    const filter = Object.fromEntries(['status', 'parameterId', 'changeType', 'createdBy'].filter(key => req.query[key]).map(key => [key, req.query[key]]));
    if (!req.identity.roles.some(role => ['CHECKER', 'ADMIN', 'AUDITOR'].includes(role))) {
      if (filter.createdBy && filter.createdBy !== req.identity.sub) return res.json(page([], Number(req.query.page ?? 0), Number(req.query.size ?? 20), 0));
      filter.createdBy = req.identity.sub;
    }
    if (req.query.createdFrom || req.query.createdTo) filter.createdAt = { ...(req.query.createdFrom ? { $gte: req.query.createdFrom } : {}), ...(req.query.createdTo ? { $lte: req.query.createdTo } : {}) };
    res.json(await service.list('requests', filter, req.query, 'createdAt,desc'));
  });
  app.post('/api/v1/change-requests', roles('MAKER'), async (req, res) => sendCreated(res, await service.createRequest(req.body, context(req))));
  app.get('/api/v1/change-requests/:id', adminReaders, async (req, res) => sendResource(req, res, await service.visibleRequest(req.params.id, context(req))));
  app.delete('/api/v1/change-requests/:id', roles('MAKER'), async (req, res) => { await service.cancelRequest(req.params.id, context(req)); res.status(204).end(); });
  for (const [path, approved] of [['approval', true], ['rejection', false]]) {
    app.get(`/api/v1/change-requests/:id/${path}`, adminReaders, async (req, res) => {
      await service.visibleRequest(req.params.id, context(req));
      const decision = await service.repo('decisions').findOne({ changeRequestId: req.params.id, decision: approved ? 'APPROVED' : 'REJECTED' });
      if (!decision) fail(404, 'NOT_FOUND', 'No existe la decisión solicitada.');
      res.json(decision);
    });
    app.post(`/api/v1/change-requests/:id/${path}`, roles('CHECKER'), async (req, res) => sendCreated(res, await service.decide(req.params.id, approved, req.body ?? {}, context(req))));
  }

  app.get('/api/v1/parameter-values', roles('CONSUMER'), async (req, res) => {
    const codes = req.query.codes ? (Array.isArray(req.query.codes) ? req.query.codes : String(req.query.codes).split(',')) : null;
    const filter = Object.fromEntries(['category', 'businessDomain'].filter(key => req.query[key]).map(key => [key, req.query[key]]));
    const scopeFilters = ['channel', 'product', 'segment'].filter(key => req.query[key]).map(key => ({ $or: [{ [`scope.${key}`]: req.query[key] }, { [`scope.${key}`]: { $exists: false } }] }));
    if (scopeFilters.length) filter.$and = scopeFilters;
    if (codes) filter.code = { $in: codes };
    const parameters = await service.repo('parameters').find(filter, { sort: { code: 1 } });
    const items = [];
    const unavailable = [];
    for (const parameter of parameters) {
      try { items.push(await service.currentValue(parameter)); }
      catch (error) {
        if (!(error instanceof Problem) || error.status !== 404) throw error;
        if (codes) unavailable.push({ code: parameter.code, reason: error.code === 'PARAMETER_INACTIVE' ? 'INACTIVE' : 'NOT_EFFECTIVE' });
      }
    }
    if (codes) for (const code of codes) if (!parameters.some(parameter => parameter.code === code)) unavailable.push({ code, reason: 'NOT_FOUND' });
    const number = Number(req.query.page ?? 0);
    const size = Number(req.query.size ?? 50);
    const result = page(items.slice(number * size, (number + 1) * size), number, size, items.length);
    if (codes) result.unavailable = unavailable;
    res.set('Cache-Control', 'private, max-age=0, must-revalidate');
    sendResource(req, res, result);
  });
  app.get('/api/v1/parameter-values/:code', roles('CONSUMER'), async (req, res) => {
    const parameter = await service.repo('parameters').findOne({ code: req.params.code });
    if (!parameter) fail(404, 'PARAMETER_NOT_FOUND', 'El parámetro no existe.');
    sendResource(req, res, await service.currentValue(parameter));
  });

  app.get('/api/v1/audit-events', roles('AUDITOR', 'ADMIN'), async (req, res) => {
    if (!req.query.parameterId && !req.query.from && !req.query.to) fail(400, 'FILTER_REQUIRED', 'Debe indicar un parámetro o un filtro temporal.');
    const filter = Object.fromEntries(['parameterId', 'operation', 'outcome', 'correlationId'].filter(key => req.query[key]).map(key => [key, req.query[key]]));
    if (req.query.actor) filter['actor.id'] = req.query.actor;
    if (req.query.from || req.query.to) filter.occurredAt = { ...(req.query.from ? { $gte: req.query.from } : {}), ...(req.query.to ? { $lte: req.query.to } : {}) };
    res.json(await service.list('audit', filter, req.query, 'occurredAt,desc'));
  });
  app.get('/api/v1/audit-events/:id', roles('AUDITOR', 'ADMIN'), async (req, res) => res.json(await service.find('audit', req.params.id)));

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || (error.code === 11000 ? 409 : 500);
    const code = error.code === 11000 ? 'DUPLICATE_RESOURCE' : typeof error.code === 'string' ? error.code : status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR';
    if (status === 401) res.set('WWW-Authenticate', 'Bearer');
    res.status(status).type('application/problem+json').json({ type: `https://api.banco.example/problems/${code.toLowerCase().replaceAll('_', '-')}`, title: status >= 500 ? 'Error interno' : 'Solicitud no procesada', status, businessCode: code, detail: status >= 500 ? 'No fue posible procesar la solicitud.' : error.message, correlationId: req.correlationId ?? randomUUID() });
  });
  return app;
}