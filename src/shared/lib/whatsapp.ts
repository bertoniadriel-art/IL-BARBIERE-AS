// Build a click-to-chat WhatsApp link addressed to an Argentine mobile — a
// client or a barber.
// Argentine mobiles need the 549 prefix (country 54 + mobile 9) before the bare
// 10-digit number the app stores ("sin 0 ni 15"); without it wa.me reports
// "el número no existe". Returns null when there is no phone to message.
export function whatsAppUrl(phone: string | null | undefined, message?: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const url = `https://wa.me/549${digits}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}
