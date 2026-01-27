<template>
  <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts';
import { debounce } from 'lodash-es';

export default {
  name: 'HeartRateChart',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    title: {
      type: String,
      default: '心率趋势图'
    },
    studentName: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const chartRef = ref(null);
    let chartInstance = null;
    
    // 预警阈值
    const WARNING_THRESHOLD = 120;
    const DANGER_THRESHOLD = 140;

    // 初始化图表
    const initChart = () => {
      if (!chartRef.value) return;
      
      chartInstance = echarts.init(chartRef.value);
      updateChart();
      
      // 窗口大小变化时重绘
      window.addEventListener('resize', handleResize);
    };

    // 更新图表
    const updateChart = () => {
      if (!chartInstance || !props.data.length) return;

      const times = props.data.map(item => 
        new Date(item.timestamp).toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
      );
      
      const heartRates = props.data.map(item => item.heart_rate);
      const temperatures = props.data.map(item => item.temperature);
      
      // 计算心率区间
      const dangerData = heartRates.map((rate, index) => 
        rate >= DANGER_THRESHOLD ? rate : null
      );
      
      const warningData = heartRates.map((rate, index) => 
        rate >= WARNING_THRESHOLD && rate < DANGER_THRESHOLD ? rate : null
      );
      
      const normalData = heartRates.map((rate, index) => 
        rate < WARNING_THRESHOLD ? rate : null
      );

      const option = {
        title: {
          text: props.studentName ? `${props.studentName} - ${props.title}` : props.title,
          left: 'center',
          textStyle: {
            color: '#333',
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            let result = `<div style="font-weight: bold">${params[0].axisValue}</div>`;
            params.forEach(param => {
              if (param.value !== null) {
                const icon = param.seriesName.includes('心率') ? '❤️' : '🌡️';
                const color = param.color;
                result += `<div>
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:5px"></span>
                  ${icon} ${param.seriesName}: <span style="font-weight:bold;color:${color}">${param.value}</span>
                </div>`;
              }
            });
            return result;
          }
        },
        legend: {
          data: ['心率(正常)', '心率(预警)', '心率(危险)', '体温'],
          top: 30,
          textStyle: {
            fontSize: 12
          }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: times,
          axisLabel: {
            rotate: 45,
            fontSize: 11
          },
          axisLine: {
            lineStyle: {
              color: '#ccc'
            }
          }
        },
        yAxis: [
          {
            type: 'value',
            name: '心率(BPM)',
            position: 'left',
            axisLine: {
              show: true,
              lineStyle: {
                color: '#ff6b6b'
              }
            },
            axisLabel: {
              formatter: '{value} BPM'
            },
            splitLine: {
              lineStyle: {
                type: 'dashed',
                color: '#e0e0e0'
              }
            }
          },
          {
            type: 'value',
            name: '体温(°C)',
            position: 'right',
            min: 35,
            max: 40,
            axisLine: {
              show: true,
              lineStyle: {
                color: '#36a3f7'
              }
            },
            axisLabel: {
              formatter: '{value} °C'
            }
          }
        ],
        series: [
          {
            name: '心率(正常)',
            type: 'line',
            data: normalData,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              color: '#4CAF50',
              width: 2
            },
            itemStyle: {
              color: '#4CAF50'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(76, 175, 80, 0.3)' },
                { offset: 1, color: 'rgba(76, 175, 80, 0.1)' }
              ])
            }
          },
          {
            name: '心率(预警)',
            type: 'line',
            data: warningData,
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
              color: '#FF9800',
              width: 2
            },
            itemStyle: {
              color: '#FF9800'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(255, 152, 0, 0.3)' },
                { offset: 1, color: 'rgba(255, 152, 0, 0.1)' }
              ])
            }
          },
          {
            name: '心率(危险)',
            type: 'line',
            data: dangerData,
            smooth: true,
            symbol: 'circle',
            symbolSize: 10,
            lineStyle: {
              color: '#F44336',
              width: 2
            },
            itemStyle: {
              color: '#F44336'
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(244, 67, 54, 0.3)' },
                { offset: 1, color: 'rgba(244, 67, 54, 0.1)' }
              ])
            }
          },
          {
            name: '体温',
            type: 'line',
            yAxisIndex: 1,
            data: temperatures,
            smooth: true,
            symbol: 'diamond',
            symbolSize: 6,
            lineStyle: {
              color: '#36a3f7',
              width: 2
            },
            itemStyle: {
              color: '#36a3f7'
            }
          }
        ],
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: 0,
            start: 0,
            end: 100
          },
          {
            show: true,
            xAxisIndex: 0,
            type: 'slider',
            top: '90%',
            start: 0,
            end: 100
          }
        ]
      };

      chartInstance.setOption(option);
    };

    // 处理窗口大小变化
    const handleResize = debounce(() => {
      if (chartInstance) {
        chartInstance.resize();
      }
    }, 300);

    // 监听数据变化
    watch(() => props.data, () => {
      updateChart();
    }, { deep: true });

    onMounted(() => {
      initChart();
    });

    onUnmounted(() => {
      if (chartInstance) {
        chartInstance.dispose();
        window.removeEventListener('resize', handleResize);
      }
    });

    return {
      chartRef
    };
  }
};
</script>