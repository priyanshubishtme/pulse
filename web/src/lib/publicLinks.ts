const configuredPublicBaseUrl = import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined;

function publicBaseUrl() {
  const fallback = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
  return (configuredPublicBaseUrl || fallback).replace(/\/+$/, '');
}

export function getShortUrl(alias: string) {
  return `${publicBaseUrl()}/${encodeURIComponent(alias)}`;
}

export function getQrUrl(alias: string) {
  return `${publicBaseUrl()}/qr/${encodeURIComponent(alias)}`;
}
