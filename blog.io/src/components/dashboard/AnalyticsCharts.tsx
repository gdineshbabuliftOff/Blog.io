'use client';

import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

interface DailyStat {
    name: string;
    views: number;
    likes: number;
}

interface TimeFrameData {
    data: DailyStat[];
    totalViews: number;
    totalLikes: number;
}

interface AnalyticsData {
    today: TimeFrameData;
    week: TimeFrameData;
    month: TimeFrameData;
    year: TimeFrameData;
}

const COLORS = ['#8884d8', '#a855f7'];

const SelectorButton = ({ active, children, onClick }: {active: boolean, children: React.ReactNode, onClick: () => void;}) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            active ? 'bg-fuchsia-500/30 text-fuchsia-400' : 'text-gray-400 hover:bg-gray-700'
        }`}
    >
        {children}
    </button>
);

export const AnalyticsCharts = () => {
    const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>('line');
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("blogToken");
                const response = await fetch('/api/analytics', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch analytics');
                }
                const data: AnalyticsData = await response.json();
                setAnalyticsData(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const data = analyticsData ? analyticsData[timeRange].data : [];
    const totals = analyticsData ? analyticsData[timeRange] : { totalViews: 0, totalLikes: 0 };
    const pieData = [{ name: 'Views', value: totals.totalViews }, { name: 'Likes', value: totals.totalLikes }];

    const renderChart = () => {
        if (loading) {
            return <div className="flex items-center justify-center h-full text-gray-400">Loading charts...</div>;
        }
        if (!data || data.length === 0) {
            return <div className="flex items-center justify-center h-full text-gray-400">No data available for this period.</div>;
        }

        switch (chartType) {
            case 'pie':
                return (
                    <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                             {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                        <Legend />
                    </PieChart>
                );
            case 'bar':
                return <BarChart data={data}><CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} /><XAxis dataKey="name" /><YAxis tickFormatter={(tick) => tick.toLocaleString()}/><Tooltip formatter={(value: number) => value.toLocaleString()}/><Legend /><Bar dataKey="views" fill="#8884d8" /><Bar dataKey="likes" fill="#a855f7" /></BarChart>;
            case 'area':
                return <AreaChart data={data}><CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} /><XAxis dataKey="name" /><YAxis tickFormatter={(tick) => tick.toLocaleString()}/><Tooltip formatter={(value: number) => value.toLocaleString()}/><Legend /><Area type="monotone" dataKey="views" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} /><Area type="monotone" dataKey="likes" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} /></AreaChart>;
            case 'line':
            default:
                return <LineChart data={data}><CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} /><XAxis dataKey="name" /><YAxis tickFormatter={(tick) => tick.toLocaleString()}/><Tooltip formatter={(value: number) => value.toLocaleString()}/><Legend /><Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} /><Line type="monotone" dataKey="likes" stroke="#a855f7" strokeWidth={2} /></LineChart>;
        }
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold">Analytics Overview</h3>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 border border-gray-700 bg-gray-900/50 p-1 rounded-lg">
                        <SelectorButton active={timeRange === 'today'} onClick={() => setTimeRange('today')}>Today</SelectorButton>
                        <SelectorButton active={timeRange === 'week'} onClick={() => setTimeRange('week')}>Week</SelectorButton>
                        <SelectorButton active={timeRange === 'month'} onClick={() => setTimeRange('month')}>Month</SelectorButton>
                        <SelectorButton active={timeRange === 'year'} onClick={() => setTimeRange('year')}>Year</SelectorButton>
                    </div>
                     <div className="flex items-center gap-2 border border-gray-700 bg-gray-900/50 p-1 rounded-lg">
                        <SelectorButton active={chartType === 'line'} onClick={() => setChartType('line')}>Line</SelectorButton>
                        <SelectorButton active={chartType === 'bar'} onClick={() => setChartType('bar')}>Bar</SelectorButton>
                        <SelectorButton active={chartType === 'area'} onClick={() => setChartType('area')}>Area</SelectorButton>
                        <SelectorButton active={chartType === 'pie'} onClick={() => setChartType('pie')}>Pie</SelectorButton>
                    </div>
                </div>
            </div>
            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};
