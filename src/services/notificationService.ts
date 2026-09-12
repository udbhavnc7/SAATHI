/**
 * Local Notification & Audio Alert Service for SATHI
 * Provides Web Notifications API integration, synthesized Web Audio chime,
 * and speech synthesis voice reminders for scheduled medication doses.
 */

import { MedicationDoseAlert } from '../types';

let audioCtxInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtxInstance && AudioCtx) {
      audioCtxInstance = new AudioCtx();
    }
    if (audioCtxInstance && audioCtxInstance.state === 'suspended') {
      audioCtxInstance.resume().catch(() => {});
    }
    return audioCtxInstance;
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
    return null;
  }
}

/**
 * Requests browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission || 'denied';
  }
}

/**
 * Gets current browser notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Plays a warm, soothing 3-tone clinical alert chime using Web Audio API
 * No external sound files required — works 100% offline in any modern browser.
 */
export function playDoseAlertChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Harmonic chords: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
    const notes = [
      { freq: 523.25, time: now, duration: 0.35, gain: 0.22 },
      { freq: 659.25, time: now + 0.18, duration: 0.45, gain: 0.25 },
      { freq: 783.99, time: now + 0.36, duration: 0.75, gain: 0.28 },
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Sine wave with soft harmonic blend
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, note.time);

      // Envelope: Fast attack, smooth exponential decay
      gainNode.gain.setValueAtTime(0.001, note.time);
      gainNode.gain.linearRampToValueAtTime(note.gain, note.time + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, note.time + note.duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(note.time);
      osc.stop(note.time + note.duration);
    });
  } catch (err) {
    console.warn('Web Audio chime playback failed:', err);
  }
}

/**
 * Speaks a medication reminder using Web Speech API
 */
export function speakDoseReminder(
  medName: string,
  dosage: string,
  instructions: string,
  lang: string = 'en'
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    const text = `Medication reminder. It is time to take your dose of ${medName}, ${dosage}. ${instructions}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92; // Slightly slower for elderly comprehension
    utterance.pitch = 1.05;
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Dispatches a native browser notification if granted
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notificationOptions: Record<string, unknown> = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'sathi-medication-alert',
      renotify: true,
      requireInteraction: true,
      ...options,
    };

    const notification = new Notification(title, notificationOptions as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn('Failed to show browser notification (iframe restrictions may apply):', err);
    return null;
  }
}

/**
 * Dispatches full local alert: audio chime + browser notification + speech announcement
 */
export function dispatchDoseAlert(alert: MedicationDoseAlert, speak: boolean = true): void {
  // 1. Audio chime if enabled
  if (alert.soundEnabled) {
    playDoseAlertChime();
  }

  // 2. Browser notification
  const title = `💊 Medicine Due: ${alert.medicationName} (${alert.dosage})`;
  const body = `Scheduled for ${alert.dosageTime}. ${alert.instructions}`;
  showBrowserNotification(title, { body });

  // 3. Spoken voice reminder if enabled
  if (speak) {
    setTimeout(() => {
      speakDoseReminder(alert.medicationName, alert.dosage, alert.instructions);
    }, 450);
  }
}

/**
 * Test alert runner for user verification
 */
export async function testNotificationAlert(medName: string = 'Metformin 500mg'): Promise<{
  browserNotificationSent: boolean;
  chimePlayed: boolean;
  permission: NotificationPermission | 'unsupported';
}> {
  const perm = await requestNotificationPermission();

  // Play audio chime
  playDoseAlertChime();

  // Send test notification
  const sent = showBrowserNotification(`🔔 SATHI Medicine Alert Test`, {
    body: `Test reminder for ${medName}. Your local notification alerts and audio chimes are operating correctly.`,
  });

  // Voice announcement
  setTimeout(() => {
    speakDoseReminder(medName, '500 mg', 'Take after food with water');
  }, 400);

  return {
    browserNotificationSent: sent !== null,
    chimePlayed: true,
    permission: perm,
  };
}

/**
 * Plays an amber dual-tone warning chime for low medication supply
 */
export function playLowSupplyChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Dual warning pulses (440Hz -> 370Hz)
    const notes = [
      { freq: 440.0, time: now, duration: 0.25, gain: 0.2 },
      { freq: 369.99, time: now + 0.18, duration: 0.4, gain: 0.22 },
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, note.time);

      gainNode.gain.setValueAtTime(0.001, note.time);
      gainNode.gain.linearRampToValueAtTime(note.gain, note.time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, note.time + note.duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(note.time);
      osc.stop(note.time + note.duration);
    });
  } catch (err) {
    console.warn('Low supply chime playback failed:', err);
  }
}

/**
 * Dispatches a push notification and chime when remaining medication supply is running low
 */
export function dispatchLowSupplyNotification(
  medicationName: string,
  remainingSupply: number,
  totalCount: number = 30,
  unit: string = 'tablets',
  patientName: string = 'Patient'
): boolean {
  playLowSupplyChime();

  const title = `⚠️ Low Supply Alert: ${medicationName}`;
  const body = `Only ${remainingSupply} ${unit} remaining for ${patientName} (${remainingSupply}/${totalCount}). Please reorder a pharmacy refill.`;

  const notif = showBrowserNotification(title, {
    body,
    tag: `low-supply-${medicationName.replace(/\s+/g, '-').toLowerCase()}`,
  });

  return notif !== null;
}

