<template>
  <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';

export default {
  name: 'EmotionChart',
  props: {
    data: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const chartRef = ref(null);
    let chartInstance = null;

    const emotionColors = {
      '平静': '#4CAF50',
      '愉快': '#FFC107',
      '焦虑': '#FF9800',
      '兴奋': '#F44336',
      '低落': '#9C27B0',
      '其他': '#607D8B'
    };

    const emotionIcons = {
      '平静': '😌',
      '愉快': '😊',
      '焦虑': '😰',
      '兴奋': '😃',
      '低落': '😔',
      '其他': '😐'
    };

    const initChart = () => {
      if (!chartRef.value) return;
      
      chartInstance = echarts.init(chartRef.value);
      
      // 处理数据：按情绪类型分组统计
      const emotionCounts = {};
      props.data.forEach(item => {
        const emotion = item.emotion_type || '其他';
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });

      const emotionData = Object.entries(emotionCounts).map(([name, value]) => ({
        name,
        value,
        itemStyle: { color: emotionColors[name] || emotionColors['其他'] }
      }));

      // 按时间线显示情绪变化
      const timelineData = props.data
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(item => ({
          time: new Date(item.timestamp).toLocaleTimeString(),
          emotion: item.emotion_type,
          confidence: item.confidence
        }));

      const option = {
        title: {
          text: '情绪状态分析',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: function(params) {
            if (params.seriesType === 'pie') {
              const emotion = params.name;
              const icon = emotionIcons[emotion] || '😐';
              return `${icon} ${emotion}<br/>
                      数量: ${params.value}<br/>
                      占比: ${params.percent}%`;
            } else if (params.seriesType === 'line') {
              return `时间: ${params.data[0]}<br/>
                      情绪: ${params.data[1]}<br/>
                      置信度: ${(params.data[2] * 100).toFixed(1)}%`;
            }
          }
        },
        grid: {
          left: '50%',
          right: '5%',
          top: '15%',
          bottom: '15%'
        },
        xAxis: {
          type: 'category',
          data: timelineData.map(d => d.time),
          axisLabel: {
            rotate: 45,
            fontSize: 10
          }
        },
        yAxis: {
          type: 'category',
          data: Object.keys(emotionIcons),
          axisLabel: {
            formatter: function(value) {
              return emotionIcons[value] + ' ' + value;
            }
          }
        },
        series: [
          {
            // 饼图：情绪分布
            name: '情绪分布',
            type: 'pie',
            radius: '40%',
            center: ['25%', '50%'],
            data: emotionData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              formatter: '{b}: {c} ({d}%)'
            }
          },
          {
            // 散点图：情绪时间线
            name: '情绪变化',
            type: 'scatter',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: timelineData.map(d => [d.time, d.emotion, d.confidence || 0.5]),
            symbolSize: function(val) {
              return (val[2] || 0.5) * 30 + 5; // 根据置信度调整大小
            },
            itemStyle: {
              color: function(params) {
                return emotionColors[params.data[1]] || emotionColors['其他'];
              }
            }
          }
        ]
      };

      chartInstance.setOption(option);
      
      // 响应式
      window.addEventListener('resize', () => {
        chartInstance.resize();
      });
    };

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