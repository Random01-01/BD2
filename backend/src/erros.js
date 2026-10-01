/** Horário já ocupado (trigger do banco ou conferência da API). */
export class ConflitoError extends Error {
  constructor(mensagem = 'Este horário acabou de ser ocupado. Escolha outro.') {
    super(mensagem);
    this.name = 'ConflitoError';
  }
}
