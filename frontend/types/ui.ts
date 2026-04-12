/**
 * Mensagem a ser exibida na notificação.
 * Tipo de notificação
 */
export interface Notification {
  message: string;
  type: 'success' | 'error' | 'warning';
}
