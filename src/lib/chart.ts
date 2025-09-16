"use client";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

let registered = false;
export function ensureChartRegistered() {
  if (registered) return;
  ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, TimeScale);
  registered = true;
}
