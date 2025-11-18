import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, COLORS } from '../config/constants';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, all
  const { user } = useAuth();

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const startDate = getStartDate(dateRange);

      // Fetch dashboard analytics
      const dashboardResponse = await axios.get(`${API_URL}/api/analytics/dashboard`, {
        params: startDate ? { startDate } : {}
      });
      setDashboardData(dashboardResponse.data);

      // Fetch driver-specific stats if user is a driver
      if (user?.id) {
        const driverResponse = await axios.get(`${API_URL}/api/analytics/driver/${user.id}`, {
          params: startDate ? { startDate } : {}
        });
        setDriverStats(driverResponse.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range) => {
    if (range === 'all') return null;

    const days = range === '7d' ? 7 : 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0
  };

  // Prepare daily trends data
  const dailyTrendsData = {
    labels: dashboardData?.dailyTrends?.slice(0, 7).reverse().map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }) || [],
    datasets: [{
      data: dashboardData?.dailyTrends?.slice(0, 7).reverse().map(d => parseInt(d.trip_count) || 0) || [0]
    }]
  };

  // Prepare status breakdown data
  const statusData = dashboardData?.statusBreakdown?.map((item, index) => ({
    name: item.status,
    count: parseInt(item.count),
    color: index === 0 ? COLORS.success : index === 1 ? COLORS.warning : COLORS.error,
    legendFontColor: COLORS.text,
    legendFontSize: 12
  })) || [];

  return (
    <ScrollView style={styles.container}>
      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        <TouchableOpacity
          style={[styles.dateRangeButton, dateRange === '7d' && styles.dateRangeButtonActive]}
          onPress={() => setDateRange('7d')}
        >
          <Text style={[styles.dateRangeText, dateRange === '7d' && styles.dateRangeTextActive]}>7 Days</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateRangeButton, dateRange === '30d' && styles.dateRangeButtonActive]}
          onPress={() => setDateRange('30d')}
        >
          <Text style={[styles.dateRangeText, dateRange === '30d' && styles.dateRangeTextActive]}>30 Days</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateRangeButton, dateRange === 'all' && styles.dateRangeButtonActive]}
          onPress={() => setDateRange('all')}
        >
          <Text style={[styles.dateRangeText, dateRange === 'all' && styles.dateRangeTextActive]}>All Time</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{dashboardData?.summary?.totalTrips || 0}</Text>
          <Text style={styles.summaryLabel}>Total Trips</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {dashboardData?.summary?.totalDistance
              ? (dashboardData.summary.totalDistance / 1000).toFixed(1)
              : 0}km
          </Text>
          <Text style={styles.summaryLabel}>Distance</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {dashboardData?.summary?.avgDistance
              ? (dashboardData.summary.avgDistance / 1000).toFixed(1)
              : 0}km
          </Text>
          <Text style={styles.summaryLabel}>Avg Trip</Text>
        </View>
      </View>

      {/* Driver Performance Score (if available) */}
      {driverStats?.performanceScore !== undefined && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Performance Score</Text>
          <View style={styles.performanceCard}>
            <Text style={styles.performanceScore}>{driverStats.performanceScore}/100</Text>
            <Text style={styles.performanceLabel}>
              {driverStats.performanceScore >= 90 ? 'Excellent' :
               driverStats.performanceScore >= 70 ? 'Good' :
               driverStats.performanceScore >= 50 ? 'Fair' : 'Needs Improvement'}
            </Text>
          </View>
        </View>
      )}

      {/* Daily Trends Chart */}
      {dailyTrendsData.labels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Trips</Text>
          <LineChart
            data={dailyTrendsData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Status Breakdown */}
      {statusData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Status</Text>
          <PieChart
            data={statusData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            style={styles.chart}
          />
        </View>
      )}

      {/* Top Drivers */}
      {dashboardData?.topDrivers && dashboardData.topDrivers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Drivers</Text>
          {dashboardData.topDrivers.slice(0, 5).map((driver, index) => (
            <View key={driver.userId} style={styles.driverCard}>
              <View style={styles.driverRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>
                  {driver.user?.firstName} {driver.user?.lastName}
                </Text>
                <Text style={styles.driverStats}>
                  {driver.tripCount} trips • {(driver.totalDistance / 1000).toFixed(1)}km
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Driver Stats (if available) */}
      {driverStats?.stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{driverStats.stats.totalOffRoute || 0}</Text>
              <Text style={styles.statLabel}>Off-Route Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{driverStats.stats.totalReroutes || 0}</Text>
              <Text style={styles.statLabel}>Reroutes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {driverStats.stats.avgDuration
                  ? Math.round(driverStats.stats.avgDuration / 60)
                  : 0}min
              </Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary
  },
  dateRangeContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
    justifyContent: 'space-between'
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  dateRangeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  dateRangeText: {
    fontSize: 14,
    color: COLORS.text
  },
  dateRangeTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    justifyContent: 'space-between'
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 15,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center'
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary
  },
  section: {
    padding: 20,
    paddingTop: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15
  },
  chart: {
    borderRadius: 10,
    marginVertical: 8
  },
  performanceCard: {
    backgroundColor: COLORS.surface,
    padding: 30,
    borderRadius: 10,
    alignItems: 'center'
  },
  performanceScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary
  },
  performanceLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8
  },
  driverCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center'
  },
  driverRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  driverInfo: {
    flex: 1
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4
  },
  driverStats: {
    fontSize: 14,
    color: COLORS.textSecondary
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 15,
    marginHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center'
  }
});
