import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const TrafficChart = ({ data }: { data: { date: string; clicks: number }[] }) => (
  <div className="h-64 w-full" aria-label="Traffic over time chart">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="12%">
        <CartesianGrid stroke="#DAD8D1" vertical={false} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#5F6B75', fontSize: 11 }} tickFormatter={(date: string) => date.slice(5)} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#5F6B75', fontSize: 11 }} width={42} tickFormatter={(value: number) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} />
        <Tooltip cursor={{ fill: '#EDE9E3' }} contentStyle={{ background: '#04213F', border: 'none', borderRadius: 10, color: '#FFFDF8', fontSize: 12 }} labelStyle={{ color: '#FFFDF8' }} />
        <Bar dataKey="clicks" fill="#0F5BE6" radius={[5, 5, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
