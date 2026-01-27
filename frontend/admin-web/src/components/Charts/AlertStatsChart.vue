<template>
  <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';

export default {
  name: 'AlertStatsChart',
  props: {
    alerts: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const chartRef = ref(null);
    let chartInstance = null;

    const severityColors = {
      'low': '#4CAF50',
      'medium': '#FF9800',
      'high': '#F44336',
      'critical': '#9C27B0'
    };

    const initChart = () => {
      if (!chartRef.value) return;
      
      chartInstance = echarts.init(chartRef.value);
      updateChart();
    };

    const updateChart = () => {
      if (!chartInstance) return;

      // 按严重程度分组
      const severityData = props.alerts.reduce((acc, alert) => {
        const severity = alert.severity || 'low';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {});

      // 按状态分组
      const statusData = props.alerts.reduce((acc, alert) => {
        const status = alert.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // 按类型分组
      const typeData = props.alerts.reduce((acc, alert) => {
        const type = alert.alert_type || 'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const option = {
        title: {
          text: '预警统计分析',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['按严重程度', '按状态', '按类型'],
          top: 30
        },
        grid: [
          {
            left: '5%',
            right: '55%',
            top: '20%',
            bottom: '60%'
          },
          {
            left: '55%',
            right: '5%',
            top: '20%',
            bottom: '60%'
          },
          {
            left: '5%',
            right: '5%',
            top: '55%',
            bottom: '5%'
          }
        ],
        xAxis: [
          {
            type: 'category',
            gridIndex: 0,
            data: Object.keys(severityData),
            axisLabel: {
              formatter: function(value) {
                const severityNames = {
                  'low': '低',
                  'medium': '中',
                  'high': '高',
                  'critical': '严重'
                };
                return severityNames[value] || value;
              }
            }
          },
          {
            type: 'category',
            gridIndex: 1,
            data: Object.keys(statusData),
            axisLabel: {
              formatter: function(value) {
                const statusNames = {
                  'pending': '待处理',
                  'processing': '处理中',
                  'resolved': '已解决',
                  'dismissed': '已忽略'
                };
                return statusNames[value] || value;
              }
            }
          },
          {
            type: 'category',
            gridIndex: 2,
            data: Object.keys(typeData)
          }
        ],
        yAxis: [
          {
            type: 'value',
            gridIndex: 0,
            name: '数量'
          },
          {
            type: 'value',
            gridIndex: 1,
            name: '数量'
          },
          {
            type: 'value',
            gridIndex: 2,
            name: '数量'
          }
        ],
        series: [
          {
            name: '按严重程度',
            type: 'bar',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: Object.entries(severityData).map(([key, value]) => ({
              value,
              itemStyle: { color: severityColors[key] || '#607D8B' }
            })),
            label: {
              show: true,
              position: 'top'
            }
          },
          {
            name: '按状态',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: Object.entries(statusData).map(([key, value]) => ({
              value,
              itemStyle: { 
                color: key === 'pending' ? '#F44336' : 
                       key === 'processing' ? '#FF9800' : '#4CAF50' 
              }
            })),
            label: {
              show: true,
              position: 'top'
            }
          },
          {
            name: '按类型',
            type: 'bar',
            xAxisIndex: 2,
            yAxisIndex: 2,
            data: Object.entries(typeData).map(([key, value]) => ({
              value,
              itemStyle: { 
                color: ['#36a3f7', '#4CAF50', '#FF9800', '#F44336', '#9C27B0'][
                  Object.keys(typeData).indexOf(key) % 5
                ]
              }
            })),
            label: {
              show: true,
              position: 'top'
            }
          }
        ]
      };

      chartInstance.setOption(option);
    };

    watch(() => props.alerts, () => {
      updateChart();
    }, { deep: true });

    onMounted(() => {
      initChart();
    });

    onUnmounted(() => {
      if (chartInstance) {
        chartInstance.dispose();
      }
    });

    return {
      chartRef
    };
  }
};
</script>