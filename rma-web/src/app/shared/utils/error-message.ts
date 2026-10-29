/** Extracts a user-facing message from an HTTP or runtime error. */
export function errorMessage(error: any): string {
  const message = error?.error?.detail || error?.message || 'No se pudo completar la operación.';
  return error?.status === 412 ? `${message} Vuelve a abrir el detalle para actualizarlo.` : message;
}
