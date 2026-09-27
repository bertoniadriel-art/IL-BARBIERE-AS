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

// Browsers only allow window.open during a user gesture; after an `await` the
// gesture is gone and the popup gets blocked (notably on Safari/iOS). Call this
// synchronously in the click handler, before any await, then `go(url)` once the
// link is known. A null url closes the placeholder tab.
export function openPendingWindow(): { go: (url: string | null | undefined) => void } {
  const tab = window.open('', '_blank');
  return {
    go(url) {
      if (!url) {
        tab?.close();
        return;
      }
      if (!tab) {
        window.open(url, '_blank');
        return;
      }
      tab.opener = null;
      tab.location.href = url;
    },
  };
}
