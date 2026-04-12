import { useQuery } from '@tanstack/react-query';
import notificationAPI from '../api/notification.api';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const [alertsRes, summaryRes, anomaliesRes] = await Promise.all([
        notificationAPI.getBudgetAlerts(),
        notificationAPI.getWeeklySummary(),
        notificationAPI.getAnomalyAlerts(),
      ]);
      return {
        alerts: alertsRes.data?.alerts || [],
        summary: summaryRes.data,
        anomalies: anomaliesRes.data?.anomalies || [],
      };
    },
  });
}
