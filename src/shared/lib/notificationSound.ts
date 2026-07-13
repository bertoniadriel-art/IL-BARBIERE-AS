// Short attention beep for the in-app "nuevo turno" notification.
// Generated with the Web Audio API so we don't ship an audio asset, and so it
// stays crisp at any volume. Only audible while the app is open — a background
// push is a separate mechanism.
export function playNotificationBeep() {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Two rising tones so it reads as a deliberate "ping", not a glitch.
    const play = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Attack/decay envelope to avoid clicks. exponentialRamp can't hit 0.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    play(880, now, 0.18); // A5
    play(1174.66, now + 0.16, 0.22); // D6

    // Free the context once the sound has finished.
    window.setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // Autoplay blocked or no audio device — degrade silently, the visual
    // banner still shows.
  }
}
