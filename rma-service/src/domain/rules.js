import { createHash } from 'node:crypto';
import Decimal from 'decimal.js';

export class Problem extends Error {
  constructor(status, code, detail) {
    super(detail);
    this.status = status;
    this.code = code;
  }
}

export function fail(status, code, detail) {
  throw new Problem(status, code, detail);
}

export function etag(value) {
  return `"${createHash('sha256').update(JSON.stringify(value)).digest('base64url')}"`;
}

export function requireMatch(header, resource) {
  if (!header) fail(428, 'PRECONDITION_REQUIRED', 'Se requiere If-Match.');
  if (header !== etag(resource)) fail(412, 'STALE_ETAG', 'El recurso ha cambiado; vuelva a consultarlo.');
}

export function validateValue(dataType, value, constraints = {}) {
  const numeric = dataType === 'MONEY' || dataType === 'PERCENTAGE';
  const valid = numeric ? (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value))
    : dataType === 'INTEGER' ? Number.isSafeInteger(value)
      : dataType === 'BOOLEAN' ? typeof value === 'boolean'
        : dataType === 'DATE' ? typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
          : dataType === 'STRING' ? typeof value === 'string'
            : dataType === 'JSON' ? value !== null && typeof value === 'object'
              : false;
  if (!valid) fail(422, 'INVALID_VALUE_TYPE', 'El valor no corresponde al tipo del parámetro.');
  if ((numeric || dataType === 'INTEGER') && ((constraints.min !== undefined && new Decimal(value).lt(constraints.min)) || (constraints.max !== undefined && new Decimal(value).gt(constraints.max)))) {
    fail(422, 'VALUE_OUT_OF_RANGE', 'El valor no cumple los límites del parámetro.');
  }
  if (constraints.allowedValues && !constraints.allowedValues.includes(String(value))) fail(422, 'VALUE_NOT_ALLOWED', 'El valor no está permitido.');
  if (constraints.pattern && (typeof value !== 'string' || !new RegExp(constraints.pattern).test(value))) fail(422, 'VALUE_PATTERN_MISMATCH', 'El valor no cumple el formato requerido.');
}

export function validateConstraints(constraints = {}) {
  if (constraints.min !== undefined && constraints.max !== undefined && constraints.min > constraints.max) fail(422, 'INVALID_CONSTRAINTS', 'El mínimo no puede superar el máximo.');
  if (constraints.pattern) {
    try { new RegExp(constraints.pattern); } catch { fail(422, 'INVALID_CONSTRAINTS', 'La expresión regular no es válida.'); }
  }
}

export function validateRequest(parameter, request, versions, now = new Date()) {
  if (versions.length && !request.baseVersionNumber) fail(422, 'BASE_VERSION_REQUIRED', 'Se requiere la versión base.');
  if (request.changeType === 'SET_VALUE') {
    if (!Object.hasOwn(request, 'proposedValue')) fail(422, 'VALUE_REQUIRED', 'Se requiere el valor propuesto.');
    validateValue(parameter.dataType, request.proposedValue, parameter.constraints);
  } else if (Object.hasOwn(request, 'proposedValue')) fail(422, 'VALUE_NOT_ALLOWED', 'Este cambio no admite un valor propuesto.');
  if (request.changeType === 'DEACTIVATE' && parameter.status !== 'ACTIVE') fail(409, 'INVALID_STATE_TRANSITION', 'Solo se pueden desactivar parámetros activos.');
  if (request.changeType === 'REACTIVATE' && (parameter.status !== 'INACTIVE' || !versions.some(version => version.changeType === 'SET_VALUE'))) fail(409, 'INVALID_STATE_TRANSITION', 'No existe un valor publicado para reactivar.');
  const start = request.effectiveFrom ? new Date(request.effectiveFrom) : now;
  if (request.effectiveTo && (new Date(request.effectiveTo) <= start || new Date(request.effectiveTo) <= now)) fail(422, 'INVALID_EFFECTIVE_PERIOD', 'El fin de vigencia debe ser posterior al inicio y a la fecha actual.');
}

export function assertDecision(request, actor, match) {
  requireMatch(match, request);
  if (request.createdBy === actor) fail(403, 'MAKER_CHECKER_VIOLATION', 'El creador no puede decidir su propia propuesta.');
  if (request.status !== 'PENDING_APPROVAL') fail(409, 'INVALID_STATE_TRANSITION', 'La propuesta ya fue resuelta.');
}

export function page(items, number, size, total) {
  return { items, page: { page: number, size, totalElements: total, totalPages: Math.ceil(total / size) } };
}