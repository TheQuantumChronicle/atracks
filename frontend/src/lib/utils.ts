import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals = 2): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(decimals) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(decimals) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
}

export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function formatUSD(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
