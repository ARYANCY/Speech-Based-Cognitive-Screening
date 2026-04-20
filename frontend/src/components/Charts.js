import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import './Charts.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Get theme colors
const getThemeColors = () => {
  const isDark = document.documentElement.classList.contains('dark-mode') || 
                 window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  return {
    background: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    text: isDark ? '#e0e0e0' : '#333333',
    grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    healthy: '#4caf50',
    mci: '#2196f3',
    moderate: '#ff9800',
    severe: '#f44336',
    inconclusive: '#9e9e9e',
  };
};

// Common chart options
const getCommonOptions = (title) => {
  const colors = getThemeColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: colors.text,
          font: {
            size: 12,
            weight: '500'
          },
          padding: 15
        }
      },
      title: {
        display: !!title,
        text: title,
        color: colors.text,
        font: {
          size: 16,
          weight: '600'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: colors.background,
        titleColor: colors.text,
        bodyColor: colors.text,
        borderColor: colors.grid,
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y || context.parsed}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: colors.grid,
          drawBorder: false
        },
        ticks: {
          color: colors.text,
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: colors.grid,
          drawBorder: false
        },
        ticks: {
          color: colors.text,
          font: {
            size: 11
          },
          callback: function(value) {
            return value + '%';
          }
        },
        beginAtZero: true,
        max: 100
      }
    }
  };
};

// Class Probabilities Bar Chart
export function ClassProbabilitiesChart({ classProbabilities }) {
  if (!classProbabilities) return null;

  const colors = getThemeColors();
  const labels = Object.keys(classProbabilities);
  const data = Object.values(classProbabilities);

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Probability (%)',
        data: data,
        backgroundColor: [
          colors.healthy,
          colors.mci,
          colors.moderate,
          colors.severe
        ],
        borderColor: [
          colors.healthy,
          colors.mci,
          colors.moderate,
          colors.severe
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  const options = {
    ...getCommonOptions('Class Probabilities'),
    indexAxis: 'y',
    plugins: {
      ...getCommonOptions().plugins,
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        ...getCommonOptions().scales.x,
        max: 100
      },
      y: {
        ...getCommonOptions().scales.y,
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <Bar data={chartData} options={options} />
    </div>
  );
}

// Dementia Probability Gauge Chart
export function DementiaProbabilityGauge({ probability }) {
  if (probability === null || probability === undefined) return null;

  const colors = getThemeColors();
  const probPercent = (probability * 100).toFixed(1);
  
  // Determine color based on probability
  let gaugeColor = colors.healthy;
  if (probability > 0.6) gaugeColor = colors.severe;
  else if (probability > 0.4) gaugeColor = colors.moderate;
  else if (probability > 0.2) gaugeColor = colors.mci;

  const chartData = {
    labels: ['Dementia Probability', 'Healthy'],
    datasets: [
      {
        data: [probability * 100, (1 - probability) * 100],
        backgroundColor: [
          gaugeColor,
          colors.healthy
        ],
        borderColor: [
          gaugeColor,
          colors.healthy
        ],
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed}%`;
          }
        }
      }
    }
  };

  return (
    <div className="gauge-chart-container">
      <Doughnut data={chartData} options={options} />
      <div className="gauge-center-text">
        <div className="gauge-value">{probPercent}%</div>
        <div className="gauge-label">Dementia Risk</div>
      </div>
    </div>
  );
}

// Stats Distribution Pie Chart
export function StatsDistributionChart({ stats }) {
  if (!stats || stats.total === 0) return null;

  const colors = getThemeColors();
  
  const chartData = {
    labels: ['Healthy', 'MCI', 'Moderate', 'Severe', 'Inconclusive'],
    datasets: [
      {
        data: [
          stats.healthy,
          stats.mci,
          stats.moderate,
          stats.severe,
          stats.inconclusive
        ],
        backgroundColor: [
          colors.healthy,
          colors.mci,
          colors.moderate,
          colors.severe,
          colors.inconclusive
        ],
        borderColor: [
          colors.healthy,
          colors.mci,
          colors.moderate,
          colors.severe,
          colors.inconclusive
        ],
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      ...getCommonOptions().plugins,
      legend: {
        display: true,
        position: 'right',
        labels: {
          color: colors.text,
          font: {
            size: 12
          },
          padding: 15,
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const percentage = stats.total > 0 ? ((value / stats.total) * 100).toFixed(1) : 0;
                return {
                  text: `${label} (${value} - ${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: 2,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

// Time Analysis Bar Chart
export function TimeAnalysisChart({ timeAnalysis, audioSignalAnalysis }) {
  if (!timeAnalysis && !audioSignalAnalysis) return null;

  const colors = getThemeColors();
  const labels = [];
  const data = [];

  if (timeAnalysis) {
    labels.push('WPM', 'Pause Ratio', 'Speaking Efficiency');
    data.push(
      Math.min(timeAnalysis.words_per_minute || 0, 200),
      (timeAnalysis.pause_ratio || 0) * 100,
      timeAnalysis.speaking_efficiency || 0
    );
  }

  if (audioSignalAnalysis) {
    labels.push('Pauses', 'Fillers', 'Pause/Speech Ratio');
    data.push(
      Math.min(audioSignalAnalysis.num_pauses_detected || 0, 50),
      Math.min(audioSignalAnalysis.num_filler_candidates || 0, 20),
      (audioSignalAnalysis.pause_to_speech_ratio || 0) * 100
    );
  }

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Metrics',
        data: data,
        backgroundColor: colors.mci,
        borderColor: colors.mci,
        borderWidth: 2,
        borderRadius: 6
      }
    ]
  };

  const options = {
    ...getCommonOptions('Time & Audio Analysis Metrics'),
    scales: {
      ...getCommonOptions().scales,
      y: {
        ...getCommonOptions().scales.y,
        max: undefined, // Auto-scale based on data
        ticks: {
          ...getCommonOptions().scales.y.ticks,
          callback: function(value) {
            // Remove % for non-percentage metrics
            return value;
          }
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <Bar data={chartData} options={options} />
    </div>
  );
}

// History Trends Line Chart
export function HistoryTrendsChart({ history }) {
  if (!history || history.length === 0) return null;

  const colors = getThemeColors();
  
  // Get last 20 items for trend
  const recentHistory = history.slice(0, 20).reverse();
  
  const labels = recentHistory.map((item, index) => {
    const date = new Date(item.timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const dementiaProbs = recentHistory.map(item => {
    const prob = item.dementia_probability !== undefined ? item.dementia_probability : item.confidence;
    return prob ? (prob * 100) : 0;
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Dementia Probability (%)',
        data: dementiaProbs,
        borderColor: colors.severe,
        backgroundColor: colors.severe + '20',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.severe,
        pointBorderColor: colors.background,
        pointBorderWidth: 2
      }
    ]
  };

  const options = {
    ...getCommonOptions('Dementia Probability Trend'),
    scales: {
      ...getCommonOptions().scales,
      y: {
        ...getCommonOptions().scales.y,
        max: 100
      }
    }
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
}

// Audio Signal Metrics Bar Chart
export function AudioSignalChart({ audioSignalAnalysis }) {
  if (!audioSignalAnalysis) return null;

  const colors = getThemeColors();
  
  const chartData = {
    labels: [
      'Pauses',
      'Fillers',
      'Pause Ratio',
      'Filler Density',
      'Speaking Efficiency'
    ],
    datasets: [
      {
        label: 'Count',
        data: [
          audioSignalAnalysis.num_pauses_detected || 0,
          audioSignalAnalysis.num_filler_candidates || 0,
          (audioSignalAnalysis.pause_ratio || 0) * 100,
          (audioSignalAnalysis.filler_density || 0) * 10, // Scale for visibility
          audioSignalAnalysis.speaking_efficiency || 0
        ],
        backgroundColor: [
          colors.mci,
          colors.moderate,
          colors.severe,
          colors.severe,
          colors.healthy
        ],
        borderColor: [
          colors.mci,
          colors.moderate,
          colors.severe,
          colors.severe,
          colors.healthy
        ],
        borderWidth: 2,
        borderRadius: 6
      }
    ]
  };

  const options = {
    ...getCommonOptions('Audio Signal Analysis'),
    scales: {
      ...getCommonOptions().scales,
      y: {
        ...getCommonOptions().scales.y,
        max: undefined,
        ticks: {
          ...getCommonOptions().scales.y.ticks,
          callback: function(value) {
            return value;
          }
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <Bar data={chartData} options={options} />
    </div>
  );
}

