import React, { useState, useEffect } from 'react';

interface WidgetData {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'list' | 'status' | 'quickActions' | 'progress';
  data: any;
  timestamp: Date;
  size?: 'small' | 'medium' | 'large' | 'wide';
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
    tension?: number;
  }[];
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface DashboardProps {
  className?: string;
  theme?: 'light' | 'dark';
}

const Dashboard: React.FC<DashboardProps> = ({ className = '', theme = 'light' }) => {
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        const mockData: WidgetData[] = [
          {
            id: 'total-users',
            title: 'Total Users',
            type: 'metric',
            size: 'small',
            data: { value: 2547, change: 12, icon: '👥', trend: 'up' },
            timestamp: new Date()
          },
          {
            id: 'revenue',
            title: 'Revenue',
            type: 'metric',
            size: 'small',
            data: { value: '$125,430', change: 8, icon: '💰', trend: 'up' },
            timestamp: new Date()
          },
          {
            id: 'orders',
            title: 'Orders',
            type: 'metric',
            size: 'small',
            data: { value: 1839, change: -3, icon: '📦', trend: 'down' },
            timestamp: new Date()
          },
          {
            id: 'growth',
            title: 'Growth',
            type: 'metric',
            size: 'small',
            data: { value: '23%', change: 15, icon: '📈', trend: 'up' },
            timestamp: new Date()
          },
          {
            id: 'system-status',
            title: 'System Status',
            type: 'status',
            size: 'medium',
            data: {
              status: 'healthy',
              uptime: '99.9%',
              lastCheck: new Date(),
              services: [
                { name: 'Server', status: 'online', response: '125ms' },
                { name: 'Database', status: 'connected', response: '45ms' },
                { name: 'API', status: 'operational', response: '89ms' }
              ]
            },
            timestamp: new Date()
          },
          {
            id: 'user-activity',
            title: 'User Activity',
            type: 'chart',
            size: 'large',
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
                },
                {
                  label: 'New Users',
                  data: [20, 35, 45, 60, 55, 40, 30],
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  borderColor: 'rgba(34, 197, 94, 1)',
                  fill: true,
                  tension: 0.4
                }
              ]
            },
            timestamp: new Date()
          },
          {
            id: 'recent-activities',
            title: 'Recent Activities',
            type: 'list',
            size: 'medium',
            data: [
              { id: 1, action: 'User login', user: 'john.doe', time: '2 min ago', type: 'info' },
              { id: 2, action: 'File uploaded', user: 'jane.smith', time: '5 min ago', type: 'success' },
              { id: 3, action: 'Settings updated', user: 'admin', time: '10 min ago', type: 'warning' },
              { id: 4, action: 'Report generated', user: 'bob.wilson', time: '15 min ago', type: 'success' },
              { id: 5, action: 'Payment processed', user: 'alice.jones', time: '20 min ago', type: 'success' },
              { id: 6, action: 'System alert', user: 'system', time: '30 min ago', type: 'error' }
            ],
            timestamp: new Date()
          },
          {
            id: 'revenue-chart',
            title: 'Monthly Revenue',
            type: 'chart',
            size: 'wide',
            data: {
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
              datasets: [
                {
                  label: 'Revenue ($)',
                  data: [45000, 52000, 48000, 61000, 58000, 67000],
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  borderColor: 'rgba(34, 197, 94, 1)',
                  fill: true,
                  tension: 0.4
                },
                {
                  label: 'Profit ($)',
                  data: [12000, 15000, 13000, 18000, 16000, 22000],
                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                  borderColor: 'rgba(168, 85, 247, 1)',
                  fill: true,
                  tension: 0.4
                }
              ]
            },
            timestamp: new Date()
          },
          {
            id: 'quick-actions',
            title: 'Quick Actions',
            type: 'quickActions',
            size: 'medium',
            data: [
              { label: 'Add User', icon: '👤', color: 'bg-blue-500', action: 'addUser' },
              { label: 'Export Data', icon: '📥', color: 'bg-green-500', action: 'exportData' },
              { label: 'Settings', icon: '⚙️', color: 'bg-gray-500', action: 'openSettings' },
              { label: 'Reports', icon: '📊', color: 'bg-purple-500', action: 'viewReports' },
              { label: 'Send Message', icon: '📧', color: 'bg-indigo-500', action: 'sendMessage' },
              { label: 'Backup', icon: '💾', color: 'bg-yellow-500', action: 'runBackup' }
            ],
            timestamp: new Date()
          },
          {
            id: 'project-progress',
            title: 'Project Progress',
            type: 'progress',
            size: 'medium',
            data: {
              projects: [
                { name: 'Website Redesign', progress: 85, deadline: '2024-01-15', status: 'on-track' },
                { name: 'Mobile App', progress: 65, deadline: '2024-02-01', status: 'on-track' },
                { name: 'API Migration', progress: 92, deadline: '2024-01-10', status: 'ahead' },
                { name: 'Security Audit', progress: 40, deadline: '2024-01-20', status: 'at-risk' }
              ]
            },
            timestamp: new Date()
          }
        ];

        setWidgets(mockData);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard load error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderWidget = (widget: WidgetData) => {
    switch (widget.type) {
      case 'metric':
        return <MetricWidget widget={widget} />;
      case 'chart':
        return <ChartWidget widget={widget} />;
      case 'list':
        return <ListWidget widget={widget} />;
      case 'status':
        return <StatusWidget widget={widget} />;
      case 'quickActions':
        return <QuickActionsWidget widget={widget} />;
      case 'progress':
        return <ProgressWidget widget={widget} />;
      default:
        return <div>Unknown widget type</div>;
    }
  };

  if (isLoading) {
    return (
      <div className={`dashboard loading ${className}`}>
        <div className="loading-spinner">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`dashboard error ${className}`}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const renderDashboardLayout = () => {
    if (isMobile) {
      return (
        <div className="dashboard-grid mobile-grid">
          {widgets.map((widget) => (
            <div key={widget.id} className="widget-container mobile-widget">
              {renderWidget(widget)}
            </div>
          ))}
        </div>
      );
    }

    const smallWidgets = widgets.filter(w => w.size === 'small');
    const mediumWidgets = widgets.filter(w => w.size === 'medium');
    const largeWidgets = widgets.filter(w => w.size === 'large');
    const wideWidgets = widgets.filter(w => w.size === 'wide');

    return (
      <div className="dashboard-grid desktop-grid">
        <div className="dashboard-row metrics-row">
          {smallWidgets.map((widget) => (
            <div key={widget.id} className="widget-container small-widget">
              {renderWidget(widget)}
            </div>
          ))}
        </div>

        <div className="dashboard-row main-content-row">
          <div className="widget-container large-widget">
            {renderWidget(largeWidgets[0])}
          </div>
          <div className="side-widgets">
            {mediumWidgets.slice(0, 2).map((widget) => (
              <div key={widget.id} className="widget-container medium-widget">
                {renderWidget(widget)}
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-row bottom-row">
          <div className="widget-container wide-widget">
            {renderWidget(wideWidgets[0])}
          </div>
          <div className="bottom-side-widgets">
            {mediumWidgets.slice(2).map((widget) => (
              <div key={widget.id} className="widget-container medium-widget">
                {renderWidget(widget)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`dashboard ${className} theme-${theme}`}>
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Real-time analytics and monitoring</p>
        </div>
        <div className="dashboard-controls">
          <button className="refresh-btn" onClick={() => window.location.reload()}>
            🔄 Refresh
          </button>
          <select className="time-range-select">
            <option value="1h">Last Hour</option>
            <option value="24h" selected>Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <div className="last-updated">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {renderDashboardLayout()}
    </div>
  );
};

const MetricWidget: React.FC<{ widget: WidgetData }> = ({ widget }) => {
  const { value, change, icon, trend } = widget.data as MetricCardProps;

  const getChangeColor = () => {
    if (change === undefined) return 'text-gray-600';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  return (
    <div className="widget metric-widget">
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-time">
          {widget.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="widget-content metric-content">
        <div className="metric-main">
          <div className="metric-icon">{icon}</div>
          <div className="metric-value-container">
            <div className="metric-value">{value}</div>
            {change !== undefined && (
              <div className={`metric-change ${getChangeColor()}`}>
                {getChangeIcon()} {Math.abs(change)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartWidget: React.FC<{ widget: WidgetData }> = ({ widget }) => {
  const chartData = widget.data as ChartData;

  const renderMultiDatasetChart = () => {
    const allValues = chartData.datasets.flatMap(dataset => dataset.data);
    const maxValue = Math.max(...allValues);

    return (
      <div className="multi-dataset-chart">
        <div className="chart-legend">
          {chartData.datasets.map((dataset, index) => (
            <div key={index} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: dataset.borderColor || '#3b82f6' }}
              />
              <span className="legend-label">{dataset.label}</span>
            </div>
          ))}
        </div>
        <div className="chart-bars">
          {chartData.labels.map((label, index) => (
            <div key={index} className="chart-bar-group">
              {chartData.datasets.map((dataset, datasetIndex) => {
                const value = dataset.data[index];
                const height = (value / maxValue) * 100;

                return (
                  <div key={datasetIndex} className="chart-bar-container">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${height}%`,
                        backgroundColor: dataset.borderColor || '#3b82f6'
                      }}
                    />
                    <div className="chart-value">{value}</div>
                  </div>
                );
              })}
              <div className="chart-label">{label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="widget chart-widget">
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-time">
          {widget.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="widget-content">
        {renderMultiDatasetChart()}
      </div>
    </div>
  );
};

const ListWidget: React.FC<{ widget: WidgetData }> = ({ widget }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return '•';
    }
  };

  return (
    <div className="widget list-widget">
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-time">
          {widget.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="widget-content">
        <div className="list-items">
          {widget.data.map((item: any) => (
            <div key={item.id} className="list-item">
              <div className="list-item-content">
                <div className="list-item-header">
                  <span className={`list-item-type ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)} {item.type}
                  </span>
                  <span className="list-item-time">{item.time}</span>
                </div>
                <div className="list-item-action">{item.action}</div>
                <div className="list-item-user">by {item.user}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatusWidget: React.FC<{ widget: WidgetData }> = ({ widget }) => {
  const statusColor = widget.data.status === 'healthy' ? 'green' : 'red';
  const getServiceColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'connected':
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-red-600 bg-red-100';
    }
  };

  const getServiceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'server': return '🖥️';
      case 'database': return '🗄️';
      case 'api': return '🔌';
      default: return '⚙️';
    }
  };

  return (
    <div className="widget status-widget">
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-time">
          {widget.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="widget-content">
        <div className="status-indicator">
          <div className={`status-dot status-${statusColor}`} />
          <span className="status-text">{widget.data.status.toUpperCase()}</span>
        </div>
        <div className="status-details">
          <div className="status-detail">
            <span className="detail-label">Uptime:</span>
            <span className="detail-value">{widget.data.uptime}</span>
          </div>
          <div className="status-detail">
            <span className="detail-label">Last Check:</span>
            <span className="detail-value">
              {widget.data.lastCheck.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="services-list">
          <h4 className="services-title">Services</h4>
          {widget.data.services.map((service: any, index: number) => (
            <div key={index} className="service-item">
              <div className="service-info">
                <span className="service-icon">{getServiceIcon(service.name)}</span>
                <span className="service-name">{service.name}</span>
              </div>
              <div className="service-status">
                <span className={`service-badge ${getServiceColor(service.status)}`}>
                  {service.status}
                </span>
                <span className="service-response">{service.response}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const QuickActionsWidget: React.FC<{ widget: WidgetData }> = ({ widget }) => {
  const handleActionClick = (action: string) => {
    console.log(`Action clicked: ${action}`);
  };

  return (
    <div className="widget quick-actions-widget">
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-time">
          {widget.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="widget-content">
        <div className="quick-actions-grid">
          {widget.data.map((action: any, index: number) => (
            <button
              key={index}
              className={`quick-action-btn ${action.color}`}
              onClick={() => handleActionClick(action.action)}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-label">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProgressWidget: React.FC<{ widget: WidgetData }> = ({ widget }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-green-600 bg-green-100';
      case 'ahead': return 'text-blue-600 bg-blue-100';
      case 'at-risk': return 'text-yellow-600 bg-yellow-100';
      case 'delayed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'at-risk') return 'bg-yellow-500';
    if (status === 'delayed') return 'bg-red-500';
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  return (
    <div className="widget progress-widget">
      <div className="widget-header">
        <h3>{widget.title}</h3>
        <span className="widget-time">
          {widget.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <div className="widget-content">
        <div className="projects-list">
          {widget.data.projects.map((project: any, index: number) => (
            <div key={index} className="project-item">
              <div className="project-header">
                <div className="project-info">
                  <h4 className="project-name">{project.name}</h4>
                  <span className="project-deadline">Due: {new Date(project.deadline).toLocaleDateString()}</span>
                </div>
                <span className={`project-status ${getStatusColor(project.status)}`}>
                  {project.status.replace('-', ' ')}
                </span>
              </div>
              <div className="project-progress">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${project.progress}%`,
                      backgroundColor: getProgressColor(project.progress, project.status)
                    }}
                  />
                </div>
                <span className="progress-percentage">{project.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;