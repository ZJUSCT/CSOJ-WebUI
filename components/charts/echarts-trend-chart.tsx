"use client";

import ReactECharts from 'echarts-for-react';
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { TrendEntry } from '@/lib/types';

interface EchartsTrendChartProps {
    trendData: TrendEntry[];
}

const EchartsTrendChart: React.FC<EchartsTrendChartProps> = ({ trendData }) => {
    const { theme } = useTheme();

    const truncateToMinute = (timestamp: number): number => {
        const date = new Date(timestamp);
        date.setSeconds(0, 0);
        return date.getTime();
    };

    const allTimePoints = new Set<number>();
    trendData.forEach(user => {
        user.history.forEach(point => {
            allTimePoints.add(truncateToMinute(new Date(point.time).getTime()));
        });
    });

    allTimePoints.add(truncateToMinute(new Date().getTime()));

    const sortedTimePoints = Array.from(allTimePoints).sort((a, b) => a - b);


    const seriesData: LineSeriesOption[] = trendData.map(user => {
        const data = sortedTimePoints.map(time => {
            const lastPoint = [...user.history]
                .filter(p => new Date(p.time).getTime() <= time)
                .pop();
            const score = lastPoint ? lastPoint.score : 0;
            return [time, score];
        });
        return {
            name: user.nickname,
            type: 'line',
            step: 'end',
            symbol: 'none',
            data: data,
        };
    });

    const option: EChartsOption = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985'
                }
            },
            formatter: (params: any) => {
                const time = format(new Date(params[0].axisValue), 'yyyy-MM-dd HH:mm:ss');
                let tooltipHtml = `${time}<br/>`;
                params.forEach((param: any) => {
                    tooltipHtml += `${param.marker} ${param.seriesName}: <strong>${param.value[1]}</strong><br/>`;
                });
                return tooltipHtml;
            }
        },
        legend: {
            data: trendData.map(user => user.nickname),
            textStyle: {
                color: theme === 'dark' ? '#ccc' : '#333',
            },
            bottom: 45,
            type: 'scroll',
        },
        grid: {
            left: '3%',
            right: '50px',
            bottom: 80,
            containLabel: true
        },
        toolbox: {
            feature: {
                saveAsImage: {
                    title: 'Download',
                    name: 'contest-trend',
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#fff'
                }
            }
        },
        xAxis: [
            {
                type: 'time',
                axisLabel: {
                    color: theme === 'dark' ? '#ccc' : '#333',
                    formatter: (value: number) => {
                        return format(new Date(value), 'yyyy-MM-dd HH:mm');
                    }
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
            {
                type: 'slider',
                xAxisIndex: 0,
                start: 0,
                end: 100,
                bottom: 10,
                height: 20,
            },
            {
                type: 'slider',
                yAxisIndex: 0,
                start: 0,
                end: 100,
                right: 10,
                width: 20,
            },
            {
                type: 'inside',
                xAxisIndex: 0,
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