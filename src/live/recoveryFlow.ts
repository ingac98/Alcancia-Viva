export type RecoveryMode = 'none' | 'pending' | 'active' | 'expired';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
const markerKey = 'av-password-recovery-user';

export function cleanRecoveryUrl(href: string) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (hash.has('error') || hash.has('error_code') || hash.get('type') === 'recovery') url.hash = '';
  return url.pathname + url.search + url.hash;
}

// Solo guarda el identificador de la sesión en esta pestaña, nunca el enlace ni la contraseña.
export function createRecoveryTracker(href: string, storage?: Storage) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  let mode: RecoveryMode = hash.has('error') || hash.has('error_code') ? 'expired' : hash.get('type') === 'recovery' ? 'pending' : 'none';
  let userId: string | null = null;
  try { userId = storage?.getItem(markerKey) || null; } catch { /* Almacenamiento opcional. */ }
  const listeners = new Set<() => void>();
  function set(next: RecoveryMode) { if (mode !== next) { mode = next; listeners.forEach(fn => fn()); } }
  function remember(id: string | null) {
    userId = id;
    try { if (id) storage?.setItem(markerKey, id); else storage?.removeItem(markerKey); } catch { /* No bloquea Auth. */ }
  }
  return {
    getSnapshot: () => mode,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    observe(event: string, sessionUserId: string | null) {
      if (event === 'PASSWORD_RECOVERY' && sessionUserId) { remember(sessionUserId); set('active'); return; }
      if (event === 'SIGNED_OUT') { remember(null); if (mode !== 'none') set('expired'); return; }
      if (event === 'INITIAL_SESSION') {
        if (mode === 'expired') return;
        if (sessionUserId && userId === sessionUserId) set('active');
        else if (mode === 'pending' || mode === 'active' || userId) { remember(null); set('expired'); }
      } else if (mode === 'active' && sessionUserId !== userId) { remember(null); set('expired'); }
    },
    finish() { remember(null); set('none'); },
  };
}

type AuthError = { message: string; code?: string; status?: number };
type RecoveryAuth = {
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>;
  getUser: () => Promise<{ data: { user: { id: string } | null }; error: AuthError | null }>;
  updateUser: (attributes: { password: string }) => Promise<{ error: AuthError | null }>;
};
export const recoverySentMessage = 'Si el correo corresponde a una cuenta, recibirás un enlace para recuperar tu contraseña. Revisa también la carpeta de spam.';
export function recoveryError(error: unknown): string {
  const e = error as Partial<AuthError> | null;
  if (e?.status === 429 || e?.code?.includes('rate_limit')) return 'Se alcanzó el límite de solicitudes. Espera unos minutos antes de volver a intentarlo.';
  if (e?.code === 'same_password') return 'Elige una contraseña diferente a la anterior.';
  if (e?.code === 'weak_password') return 'Usa una contraseña más segura, de al menos 8 caracteres. Evita contraseñas comunes.';
  if (e?.status === 401 || e?.status === 403 || ['session_not_found', 'refresh_token_not_found', 'otp_expired'].includes(e?.code || '')) return 'El enlace venció o ya no es válido. Solicita uno nuevo.';
  return 'No pudimos completar la solicitud. Revisa tu conexión y vuelve a intentarlo.';
}
export async function requestPasswordReset(auth: Pick<RecoveryAuth, 'resetPasswordForEmail'>, email: string) {
  // Sin redirectTo: Supabase usa el Site URL oficial, incluso desde vistas de revisión.
  const { error } = await auth.resetPasswordForEmail(email.trim());
  if (error) throw error;
  return recoverySentMessage;
}
export async function saveRecoveredPassword(auth: Pick<RecoveryAuth, 'getUser' | 'updateUser'>, userId: string, password: string, confirmation: string) {
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
  const { data, error } = await auth.getUser();
  if (error) throw new Error(recoveryError(error));
  if (!data.user || data.user.id !== userId) throw new Error('El enlace venció o ya no es válido. Solicita uno nuevo.');
  const result = await auth.updateUser({ password });
  if (result.error) throw new Error(recoveryError(result.error));
}
