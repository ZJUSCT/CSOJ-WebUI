// components/charts/echarts-trend-chart.tsx
"use client";

import ReactECharts from 'echarts-for-react';
// Import specific types from ECharts
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { TrendEntry } from '@/lib/types';

interface EchartsTrendChartProps {
    trendData: TrendEntry[];
}

const EchartsTrendChart: React.FC<EchartsTrendChartProps> = ({ trendData }) => {
    const { theme } = useTheme();

    const allTimePoints = new Set<number>();
    trendData.forEach(user => {
        user.history.forEach(point => {
            allTimePoints.add(new Date(point.time).getTime());
        });
    });

    // Add the current time to the set to extend the axis to now
    allTimePoints.add(new Date().getTime());

    const sortedTimePoints = Array.from(allTimePoints).sort((a, b) => a - b);


    const seriesData: LineSeriesOption[] = trendData.map(user => {
        const data = sortedTimePoints.map(time => {
            // Find the last recorded score for the user at or before the current time point
            const lastPoint = [...user.history]
                .filter(p => new Date(p.time).getTime() <= time)
                .pop(); // The last element is the latest score
            return lastPoint ? lastPoint.score : 0;
        });
        return {
            name: user.nickname,
            type: 'line',
            step: 'end', // Use a step chart to accurately represent score changes over time
            symbol: 'none', // Do not show symbols on data points for a cleaner look
            data: data,
        };
    });

    const xAxisData = sortedTimePoints.map(time => format(new Date(time), 'HH:mm:ss'));

    const option: EChartsOption = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985'
                }
            }
        },
        legend: {
            data: trendData.map(user => user.nickname),
            textStyle: {
                color: theme === 'dark' ? '#ccc' : '#333',
            },
            bottom: 45, // Position legend 45px from the bottom, above the slider
            type: 'scroll', // Allow legend to scroll if it has too many items
        },
        grid: {
            left: '3%',
            right: '50px', // Increase right margin for vertical dataZoom slider
            bottom: 80, // Reserve 80px at the bottom for controls to prevent overlap
            containLabel: true
        },
        toolbox: {
            feature: {
                saveAsImage: {
                    title: 'Download',
                    name: 'contest-trend',
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#fff' // Set background for saved image
                }
            }
        },
        xAxis: [
            {
                type: 'category',
                boundaryGap: false,
                data: xAxisData,
                axisLabel: {
                    color: theme === 'dark' ? '#ccc' : '#333'
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                axisLabel: {
                    color: theme === 'dark' ? '#ccc' : '#333'
                }
            }
        ],
        dataZoom: [
            // Horizontal slider for X-axis
            {
                type: 'slider',
                xAxisIndex: 0,
                start: 0,
                end: 100,
                bottom: 10, // Position 10px from the bottom
                height: 20,
            },
            // Vertical slider for Y-axis
            {
                type: 'slider',
                yAxisIndex: 0,
                start: 0,
                end: 100,
                right: 10, // Position 10px from the right
                width: 20,
            },
            // Inside zooming (mouse wheel) for both axes
            {
                type: 'inside',
                xAxisIndex: 0,
                yAxisIndex: 0,
                start: 0,
                end: 100,
            },
        ],
        series: seriesData,
    };

    return (
        <ReactECharts
            option={option}
            theme={theme === 'dark' ? 'dark' : 'light'}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
        />
    );
};

export default EchartsTrendChart;