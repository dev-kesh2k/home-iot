// Erro HTTP da API (sem banco: dá para usar em módulos testáveis). O devices.js reexporta.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
