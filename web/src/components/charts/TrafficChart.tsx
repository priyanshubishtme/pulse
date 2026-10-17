import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const TrafficChart = ({ data }: { data: any[] }) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0F5BE6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#0F5BE6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="#D9D4CB" tick={{ fill: '#5B6B7F', fontSize: 12 }} />
          <YAxis stroke="#D9D4CB" tick={{ fill: '#5B6B7F', fontSize: 12 }} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9E3" />
          <Tooltip
            contentStyle={{ backgroundColor: '#04213F', color: '#FFFDF8', borderRadius: '8px', border: 'none' }}
            itemStyle={{ color: '#FFFDF8' }}
          />
          <Area type="monotone" dataKey="clicks" stroke="#0F5BE6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
