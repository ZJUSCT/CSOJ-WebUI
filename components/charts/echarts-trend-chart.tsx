"use client";

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption, LineSeriesOption } from 'echarts';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { TrendEntry } from '@/lib/types';

interface EchartsTrendChartProps {
    trendData: TrendEntry[];
}

const truncateToSecond = (timestamp: number): number => {
    const date = new Date(timestamp);
    date.setMilliseconds(0);
    return date.getTime();
};


const EchartsTrendChart: React.FC<EchartsTrendChartProps> = ({ trendData }) => {
    const { theme } = useTheme();

    const sortedTimePoints = useMemo(() => {
        const allTimePoints = new Set<number>();
        trendData.forEach(user => {
            user.history.forEach(point => {
                allTimePoints.add(truncateToSecond(new Date(point.time).getTime()));
            });
        });
        allTimePoints.add(truncateToSecond(new Date().getTime()));

        return Array.from(allTimePoints).sort((a, b) => a - b);
    }, [trendData]);

    const seriesData: LineSeriesOption[] = useMemo(() => {
        const sortedUserHistories = trendData.map(user => ({
            ...user,
            history: user.history
                .map(p => ({ ...p, time: truncateToSecond(new Date(p.time).getTime()) }))
                .sort((a, b) => a.time - b.time),
        }));

        const historyPointers: Record<string, number> = Object.fromEntries(trendData.map(u => [u.user_id, 0]));
        const currentUserScores: Record<string, number> = Object.fromEntries(trendData.map(u => [u.user_id, 0]));
        const seriesDataMap: Record<string, [number, number][]> = Object.fromEntries(trendData.map(u => [u.user_id, []]));

        for (const masterTime of sortedTimePoints) {
            for (const user of sortedUserHistories) {
                while (
                    historyPointers[user.user_id] < user.history.length &&
                    user.history[historyPointers[user.user_id]].time <= masterTime
                ) {
                    currentUserScores[user.user_id] = user.history[historyPointers[user.user_id]].score;
                    historyPointers[user.user_id]++;
                }
                seriesDataMap[user.user_id].push([masterTime, currentUserScores[user.user_id]]);
            }
        }

        return trendData.map((user): LineSeriesOption => ({
            name: user.nickname,
            type: 'line',
            step: 'end',
            symbol: 'none',
            data: seriesDataMap[user.user_id],
        }));
    }, [trendData, sortedTimePoints]);

    const option: EChartsOption = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
                const time = format(new Date(params[0].axisValue), 'yyyy-MM-dd HH:mm:ss');
                let tooltipHtml = `${time}<br/>`;
                params.sort((a: any, b: any) => b.value[1] - a.value[1]);
                params.forEach((param: any) => {
                    tooltipHtml += `${param.marker} ${param.seriesName}: <strong>${param.value[1]}</strong><br/>`;
                });
                return tooltipHtml;
            }
        },
        legend: {
            data: trendData.map(user => user.nickname),
            textStyle: { color: theme === 'dark' ? '#ccc' : '#333' },
            bottom: 45,
            type: 'scroll',
        },
        grid: { left: '3%', right: '50px', bottom: 80, containLabel: true },
        toolbox: {
            feature: {
                saveAsImage: {
                    title: 'Download',
                    name: 'contest-trend',
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#fff'
                }
            }
        },
        xAxis: [{
            type: 'time',
            axisLabel: {
                color: theme === 'dark' ? '#ccc' : '#333',
                formatter: (value: number) => format(new Date(value), 'HH:mm:ss')
            }
        }],
        yAxis: [{
            type: 'value',
            axisLabel: { color: theme === 'dark' ? '#ccc' : '#333' }
        }],
        dataZoom: [
            { type: 'slider', xAxisIndex: 0, start: 0, end: 100, bottom: 10, height: 20 },
            { type: 'inside', xAxisIndex: 0, start: 0, end: 100 },
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