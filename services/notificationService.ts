// Notification Service for Budget Tracking
// Handles PWA push notifications for expense tracking

export interface BudgetNotificationData {
  spent: number;
  remaining: number;
  budget: number;
  expenseDescription: string;
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Initialize the service worker and request notification permission
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers not supported');
        return false;
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return false;
      }

      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('✅ Service Worker registered');

      // Request notification permission
      const permission = await this.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    // Already granted
    if (Notification.permission === 'granted') {
      return 'granted';
    }

    // Already denied
    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      this.swRegistration !== null
    );
  }

  /**
   * Show budget notification when expense is added
   */
  async showBudgetNotification(data: BudgetNotificationData): Promise<void> {
    if (!this.isEnabled()) {
      console.warn('⚠️ Notifications not enabled');

      // Try to request permission again if denied
      if (Notification.permission === 'default') {
        await this.requestPermission();
      }
      return;
    }

    try {
      const { spent, remaining, budget, expenseDescription } = data;
      const spentPercentage = Math.round((spent / budget) * 100);

      // Determine notification urgency and message
      let title = '💰 예산 현황';
      let body = '';
      let urgency: 'low' | 'normal' | 'high' = 'normal';

      if (remaining <= 0) {
        title = '🚨 예산 초과!';
        body = `"${expenseDescription}" 지출 후 ${Math.abs(remaining).toLocaleString()}원 초과했어요!`;
        urgency = 'high';
      } else if (spentPercentage >= 85) {
        title = '⚠️ 예산 거의 소진!';
        body = `"${expenseDescription}" 지출 후 ${remaining.toLocaleString()}원 남았어요 (${spentPercentage}% 사용)`;
        urgency = 'high';
      } else if (spentPercentage >= 50) {
        title = '📊 예산 절반 사용';
        body = `"${expenseDescription}" 지출 후 ${remaining.toLocaleString()}원 남았어요 (${spentPercentage}% 사용)`;
        urgency = 'normal';
      } else {
        title = '✅ 지출 등록 완료';
        body = `"${expenseDescription}" 지출 완료! ${spent.toLocaleString()}원 썼고 ${remaining.toLocaleString()}원 남았어요`;
        urgency = 'low';
      }

      // Show notification
      await this.showNotification({
        title,
        body,
        tag: 'budget-update',
        urgency,
        data: {
          spent,
          remaining,
          budget,
          spentPercentage,
        },
      });
    } catch (error) {
      console.error('❌ Failed to show notification:', error);
    }
  }

  /**
   * Show a generic notification
   */
  private async showNotification(options: {
    title: string;
    body: string;
    tag?: string;
    urgency?: 'low' | 'normal' | 'high';
    data?: any;
  }): Promise<void> {
    if (!this.swRegistration) {
      console.warn('⚠️ Service Worker not registered');
      return;
    }

    const { title, body, tag = 'notification', urgency = 'normal', data } = options;

    // Vibration pattern based on urgency
    const vibrate =
      urgency === 'high'
        ? [200, 100, 200, 100, 200]
        : urgency === 'normal'
        ? [200, 100, 200]
        : [200];

    try {
      await this.swRegistration.showNotification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/201/201623.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/201/201623.png',
        vibrate: vibrate as VibratePattern,
        tag,
        requireInteraction: urgency === 'high',
        silent: urgency === 'low',
        data,
      } as NotificationOptions);
    } catch (error) {
      console.warn('⚠️ SW notification failed, using fallback');
      // Fallback: Use browser Notification API
      this.showBrowserNotification(title, body);
    }
  }

  /**
   * Fallback: Browser notification (without service worker)
   */
  private showBrowserNotification(title: string, body: string): void {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/201/201623.png',
        });

        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
      }
    } catch (error) {
      console.error('❌ Notification failed:', error);
    }
  }

  /**
   * Test notification (for debugging)
   */
  async testNotification(): Promise<void> {
    await this.showNotification({
      title: '🧪 테스트 알림',
      body: '푸시 알림이 정상적으로 작동합니다!',
      tag: 'test',
      urgency: 'normal',
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
