import { randomUUID, createHash } from 'node:crypto';
import { Problem, assertDecision, etag, fail, page, requireMatch, validateConstraints, validateRequest, validateValue } from '../domain/rules.js';

const now = () => new Date().toISOString();
const has = (object, key) => Object.hasOwn(object, key);

export class RmaService {
  constructor(store) { this.store = store; }
  repo(name, session) { return this.store.repo(name, session); }

  async find(name, id, session) {
    const result = await this.repo(name, session).findOne({ id });
    if (!result) fail(404, 'NOT_FOUND', 'No se encontró el recurso solicitado.');
    return result;
  }

  async audit(session, context, operation, resourceType, resourceId, parameterId, extra = {}) {
    await this.repo('audit', session).insert({ id: randomUUID(), occurredAt: now(), actor: { id: context.actor, type: context.actorType ?? 'USER', roles: context.roles }, operation, resourceType, resourceId, ...(parameterId ? { parameterId } : {}), outcome: 'SUCCESS', correlationId: context.correlationId, ...extra });
  }

  async idempotent(context, action, callback) {
    const fingerprint = createHash('sha256').update(JSON.stringify({ action, body: context.body ?? null, match: context.match ?? null })).digest('hex');
    const key = context.key;
    try {
      return await this.store.transaction(async session => {
        const repository = this.repo('idempotency', session);
        const existing = await repository.findOne({ actor: context.actor, key });
        if (existing) {
          if (existing.fingerprint !== fingerprint) fail(422, 'IDEMPOTENCY_KEY_REUSED', 'La clave ya fue utilizada para otra solicitud.');
          return existing.response;
        }
        const response = await callback(session);
        await repository.insert({ actor: context.actor, key, fingerprint, response, expiresAt: new Date(Date.now() + 86400000) });
        return response;
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const existing = await this.repo('idempotency').findOne({ actor: context.actor, key });
      if (!existing) throw error;
      if (existing.fingerprint !== fingerprint) fail(422, 'IDEMPOTENCY_KEY_REUSED', 'La clave ya fue utilizada para otra solicitud.');
      return existing.response;
    }
  }

  async createParameter(body, context) {
    validateConstraints(body.constraints);
    return this.idempotent(context, 'createParameter', async session => {
      if (await this.repo('parameters', session).findOne({ code: body.code })) fail(409, 'DUPLICATE_CODE', 'El código ya existe.');
      const parameter = { ...body, id: randomUUID(), status: 'DRAFT', currentVersionNumber: null, createdAt: now(), createdBy: context.actor };
      await this.repo('parameters', session).insert(parameter);
      await this.audit(session, context, 'PARAMETER_CREATED', 'PARAMETER', parameter.id, parameter.id);
      return { status: 201, body: parameter, headers: { ETag: etag(parameter), Location: `/api/v1/parameters/${parameter.id}` } };
    });
  }

  async updateParameter(id, body, context) {
    validateConstraints(body.constraints);
    return this.store.transaction(async session => {
      const parameter = await this.find('parameters', id, session);
      requireMatch(context.match, parameter);
      const versions = await this.repo('versions', session).find({ parameterId: id });
      for (const version of versions) if (has(version, 'value')) validateValue(parameter.dataType, version.value, body.constraints);
      const updated = { id, code: parameter.code, dataType: parameter.dataType, ...(parameter.scope ? { scope: parameter.scope } : {}), ...body, status: parameter.status, currentVersionNumber: parameter.currentVersionNumber, createdAt: parameter.createdAt, createdBy: parameter.createdBy, updatedAt: now(), updatedBy: context.actor };
      await this.repo('parameters', session).collection.replaceOne({ id }, updated, { session });
      await this.audit(session, context, 'PARAMETER_UPDATED', 'PARAMETER', id, id);
      return updated;
    });
  }

  async retireParameter(id, context) {
    return this.store.transaction(async session => {
      const parameter = await this.find('parameters', id, session);
      requireMatch(context.match, parameter);
      if (parameter.status !== 'DRAFT' || await this.repo('versions', session).findOne({ parameterId: id })) fail(409, 'PARAMETER_PUBLISHED', 'Solo se pueden retirar borradores sin publicar.');
      await this.repo('parameters', session).update({ id }, { $set: { status: 'INACTIVE', updatedAt: now(), updatedBy: context.actor } });
      await this.audit(session, context, 'PARAMETER_RETIRED', 'PARAMETER', id, id);
    });
  }

  async createRequest(body, context) {
    return this.idempotent(context, 'createRequest', async session => {
      await this.synchronize(body.parameterId, session);
      const parameter = await this.find('parameters', body.parameterId, session);
      const versions = await this.repo('versions', session).find({ parameterId: parameter.id }, { sort: { versionNumber: -1 } });
      validateRequest(parameter, body, versions);
      const request = { ...body, ...(body.effectiveFrom ? { effectiveFrom: new Date(body.effectiveFrom).toISOString() } : {}), ...(body.effectiveTo ? { effectiveTo: new Date(body.effectiveTo).toISOString() } : {}), id: randomUUID(), parameterCode: parameter.code, status: 'PENDING_APPROVAL', createdAt: now(), createdBy: context.actor };
      await this.repo('requests', session).insert(request);
      await this.audit(session, context, 'CHANGE_REQUEST_CREATED', 'CHANGE_REQUEST', request.id, parameter.id);
      return { status: 201, body: request, headers: { ETag: etag(request), Location: `/api/v1/change-requests/${request.id}` } };
    });
  }

  async visibleRequest(id, context, session) {
    const request = await this.find('requests', id, session);
    if (!context.roles.some(role => ['CHECKER', 'ADMIN', 'AUDITOR'].includes(role)) && request.createdBy !== context.actor) fail(404, 'NOT_FOUND', 'No se encontró la propuesta.');
    return request;
  }

  async cancelRequest(id, context) {
    return this.store.transaction(async session => {
      const request = await this.find('requests', id, session);
      if (request.createdBy !== context.actor) fail(403, 'FORBIDDEN', 'Solo el creador puede cancelar la propuesta.');
      requireMatch(context.match, request);
      if (request.status !== 'PENDING_APPROVAL') fail(409, 'INVALID_STATE_TRANSITION', 'La propuesta ya fue resuelta.');
      await this.repo('requests', session).update({ id }, { $set: { status: 'CANCELLED' } });
      await this.audit(session, context, 'CHANGE_REQUEST_CANCELLED', 'CHANGE_REQUEST', id, request.parameterId);
    });
  }

  async decide(id, approved, body, context) {
    return this.idempotent(context, `${approved ? 'approve' : 'reject'}:${id}`, async session => {
      const request = await this.find('requests', id, session);
      assertDecision(request, context.actor, context.match);
      const decidedAt = now();
      const decision = { changeRequestId: id, decision: approved ? 'APPROVED' : 'REJECTED', decidedBy: context.actor, decidedAt };
      if (approved) {
        await this.synchronize(request.parameterId, session);
        const parameter = await this.find('parameters', request.parameterId, session);
        const versions = await this.repo('versions', session).find({ parameterId: parameter.id }, { sort: { versionNumber: -1 } });
        const current = this.effectiveVersion(versions, decidedAt);
        const baseVersion = current?.versionNumber ?? versions[0]?.versionNumber ?? null;
        if ((request.baseVersionNumber ?? null) !== baseVersion) fail(409, 'BASE_VERSION_MISMATCH', 'La versión base cambió.');
        validateRequest(parameter, request, versions, new Date(decidedAt));
        const start = request.effectiveFrom && request.effectiveFrom > decidedAt ? request.effectiveFrom : decidedAt;
        if (versions.some(version => version.effectiveFrom > decidedAt && (!request.effectiveTo || version.effectiveFrom < request.effectiveTo) && (!version.effectiveTo || version.effectiveTo > start))) fail(409, 'EFFECTIVE_PERIOD_CONFLICT', 'Existe una programación incompatible.');
        const value = request.changeType === 'SET_VALUE' ? request.proposedValue : request.changeType === 'REACTIVATE' ? versions.find(version => version.changeType === 'SET_VALUE')?.value : undefined;
        const version = { parameterId: parameter.id, versionNumber: (versions[0]?.versionNumber ?? 0) + 1, status: start > decidedAt ? 'SCHEDULED' : 'ACTIVE', changeType: request.changeType, ...(value === undefined ? {} : { value }), effectiveFrom: start, effectiveTo: request.effectiveTo ?? null, changeRequestId: id, reason: request.reason, createdBy: request.createdBy, approvedBy: context.actor, approvedAt: decidedAt };
        await this.repo('versions', session).insert(version);
        await this.repo('parameters', session).update({ id: parameter.id }, { $set: { updatedAt: decidedAt, updatedBy: context.actor, ...(start <= decidedAt ? { currentVersionNumber: version.versionNumber, status: request.changeType === 'DEACTIVATE' ? 'INACTIVE' : 'ACTIVE' } : {}) } });
        Object.assign(decision, { resultingVersionNumber: version.versionNumber, publicationStatus: version.status }, body.comment ? { comment: body.comment } : {});
        await this.audit(session, context, 'VERSION_PUBLISHED', 'PARAMETER_VERSION', id, parameter.id, { versionNumber: version.versionNumber });
      } else decision.rejectionReason = body.reason;
      await this.repo('requests', session).update({ id }, { $set: { status: decision.decision, decidedAt, decidedBy: context.actor, ...(decision.resultingVersionNumber ? { resultingVersionNumber: decision.resultingVersionNumber } : {}) } });
      await this.repo('decisions', session).insert(decision);
      await this.audit(session, context, approved ? 'CHANGE_REQUEST_APPROVED' : 'CHANGE_REQUEST_REJECTED', 'CHANGE_REQUEST', id, request.parameterId);
      return { status: 201, body: decision, headers: { Location: `/api/v1/change-requests/${id}/${approved ? 'approval' : 'rejection'}` } };
    });
  }

  effectiveVersion(versions, instant = now()) {
    const eligible = versions.filter(version => version.effectiveFrom <= instant).sort((left, right) => right.effectiveFrom.localeCompare(left.effectiveFrom) || right.versionNumber - left.versionNumber);
    const latest = eligible[0];
    return latest && (!latest.effectiveTo || latest.effectiveTo > instant) ? latest : null;
  }

  async synchronize(id, session) {
    const repository = this.repo('parameters', session);
    const parameter = await repository.findOne({ id });
    if (!parameter) return;
    const versions = await this.repo('versions', session).find({ parameterId: id });
    if (!versions.length) return;
    const instant = now();
    const current = this.effectiveVersion(versions, instant);
    const system = { actor: 'system', actorType: 'SYSTEM', roles: [], correlationId: randomUUID() };
    for (const version of versions) {
      const expected = version.effectiveFrom > instant ? 'SCHEDULED' : current?.versionNumber === version.versionNumber ? 'ACTIVE' : 'EXPIRED';
      if (expected !== version.status) {
        await this.repo('versions', session).update({ parameterId: id, versionNumber: version.versionNumber }, { $set: { status: expected } });
        if (expected !== 'SCHEDULED') await this.audit(session, system, expected === 'ACTIVE' ? 'VERSION_ACTIVATED' : 'VERSION_EXPIRED', 'PARAMETER_VERSION', version.changeRequestId, id, { versionNumber: version.versionNumber });
      }
    }
    const nextStatus = current && current.changeType !== 'DEACTIVATE' ? 'ACTIVE' : !current && versions.every(version => version.effectiveFrom > instant) ? 'DRAFT' : 'INACTIVE';
    const nextVersion = current?.versionNumber ?? null;
    if (parameter.status !== nextStatus || parameter.currentVersionNumber !== nextVersion) await repository.update({ id }, { $set: { status: nextStatus, currentVersionNumber: nextVersion, updatedAt: instant, updatedBy: 'system' } });
  }

  async synchronizeAll() {
    const parameters = await this.repo('parameters').find();
    for (const parameter of parameters) await this.store.transaction(session => this.synchronize(parameter.id, session));
  }

  async currentValue(parameter) {
    const versions = await this.repo('versions').find({ parameterId: parameter.id });
    if (!versions.length && parameter.status === 'INACTIVE') fail(404, 'PARAMETER_INACTIVE', 'El parámetro está inactivo.');
    const version = this.effectiveVersion(versions);
    if (!version) fail(404, 'PARAMETER_NOT_EFFECTIVE', 'El parámetro no tiene una versión vigente.');
    if (version.changeType === 'DEACTIVATE') fail(404, 'PARAMETER_INACTIVE', 'El parámetro está inactivo.');
    return { code: parameter.code, dataType: parameter.dataType, value: version.value, ...(parameter.unit ? { unit: parameter.unit } : {}), ...(parameter.scope ? { scope: parameter.scope } : {}), versionNumber: version.versionNumber, effectiveFrom: version.effectiveFrom, effectiveTo: version.effectiveTo };
  }

  async list(name, filter, query, defaultSort) {
    const pageNumber = Number(query.page ?? 0);
    const size = Number(query.size ?? 20);
    const [field, direction] = (query.sort ?? defaultSort).split(',');
    const repository = this.repo(name);
    const [items, total] = await Promise.all([repository.find(filter, { sort: { [field]: direction === 'desc' ? -1 : 1 }, skip: pageNumber * size, limit: size }), repository.count(filter)]);
    return page(items, pageNumber, size, total);
  }
}