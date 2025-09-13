import React from 'react';
import Dashboard from './Dashboard';
import type { WidgetData, DashboardConfig } from './Dashboard.types';

const exampleDashboardConfig: DashboardConfig = {
  theme: 'light',
  autoRefresh: true,
  refreshInterval: 30000,
  layout: 'grid',
  widgetColumns: 3,
  showControls: true,
};

const exampleWidgets: WidgetData[] = [
  {
    id: 'system-overview',
    title: 'System Overview',
    type: 'status',
    data: {
      status: 'healthy',
      uptime: '99.9%',
      lastCheck: new Date(),
      version: '2.11.0',
      environment: 'production'
    },
    timestamp: new Date(),
  },
  {
    id: 'performance-metrics',
    title: 'Performance Metrics',
    type: 'metric',
    data: {
      cpu: 45,
      memory: 62,
      disk: 78,
      network: 23,
      responseTime: 145
    },
    timestamp: new Date(),
  },
  {
    id: 'user-activity',
    title: 'User Activity (Last 7 Days)',
    type: 'chart',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Active Users',
          data: [120, 150, 180, 200, 170, 140, 110],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    timestamp: new Date(),
  },
  {
    id: 'revenue-analytics',
    title: 'Revenue Analytics',
    type: 'chart',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Revenue ($)',
          data: [45000, 52000, 48000, 61000, 58000, 67000],
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: 'rgba(34, 197, 94, 1)',
          fill: true
        },
        {
          label: 'Target ($)',
          data: [50000, 50000, 55000, 55000, 60000, 60000],
          backgroundColor: 'rgba(251, 146, 60, 0.2)',
          borderColor: 'rgba(251, 146, 60, 1)',
          borderDash: [5, 5],
          fill: false
        }
      ]
    },
    timestamp: new Date(),
  },
  {
    id: 'recent-activities',
    title: 'Recent Activities',
    type: 'list',
    data: [
      { id: 1, action: 'User login', user: 'john.doe', time: '2 min ago', severity: 'info' },
      { id: 2, action: 'File uploaded', user: 'jane.smith', time: '5 min ago', severity: 'success' },
      { id: 3, action: 'Settings updated', user: 'admin', time: '10 min ago', severity: 'warning' },
      { id: 4, action: 'Report generated', user: 'bob.wilson', time: '15 min ago', severity: 'info' },
      { id: 5, action: 'Security alert', user: 'system', time: '20 min ago', severity: 'error' }
    ],
    timestamp: new Date(),
  },
  {
    id: 'api-performance',
    title: 'API Performance',
    type: 'metric',
    data: {
      avgResponseTime: 145,
      successRate: 98.5,
      errorRate: 1.5,
      requestsPerMinute: 1250,
      uptime: 99.9
    },
    timestamp: new Date(),
  }
];

const DashboardExample: React.FC = () => {
  const handleWidgetUpdate = (widgetId: string, data: any) => {
    console.log(`Widget ${widgetId} updated:`, data);
  };

  const handleWidgetError = (widgetId: string, error: Error) => {
    console.error(`Widget ${widgetId} error:`, error);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '8px'
          }}>
            Dashboard Component Example
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#64748b',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            A responsive dashboard with multiple widget types, chart integration, and real-time data updates
          </p>
        </div>

        <Dashboard
          className="custom-dashboard"
          config={exampleDashboardConfig}
          widgets={exampleWidgets}
          onWidgetUpdate={handleWidgetUpdate}
          onWidgetError={handleWidgetError}
        />

        <div style={{
          marginTop: '40px',
          padding: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#374151', marginBottom: '16px' }}>
            Features
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
                🎯 Multiple Widget Types
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Status indicators, metrics charts, activity lists, and more
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
                📊 Chart Integration
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Built-in chart rendering with customizable datasets
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
                📱 Responsive Design
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Mobile-first approach with adaptive layouts
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
                ⚡ Real-time Updates
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Auto-refresh with configurable intervals
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
                🎨 TypeScript Support
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Full type safety with comprehensive interfaces
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4b5563', marginBottom: '8px' }}>
                🔧 Customizable
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Extensible with custom themes and configurations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardExample;