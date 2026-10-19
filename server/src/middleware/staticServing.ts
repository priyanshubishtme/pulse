import express, { RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';

const frontendRoutes = new Set([
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/links',
  '/create-link',
  '/campaigns',
  '/analytics',
  '/qr-codes',
  '/import',
  '/admin'
]);

const frontendRoutePatterns = [
  /^\/status\/[^/]+$/,
  /^\/unlock\/[^/]+$/,
  /^\/continue\/[^/]+$/,
  /^\/campaigns\/[^/]+$/
];

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

export function isFrontendRoute(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  return frontendRoutes.has(normalizedPathname)
    || frontendRoutePatterns.some(pattern => pattern.test(normalizedPathname));
}

export function isStaticAssetRequest(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);

  // These paths belong to the backend even when a malformed request happens
  // to include a file extension. They must never fall through to the SPA.
  if (
    normalizedPathname === '/health'
    || normalizedPathname === '/api'
    || normalizedPathname.startsWith('/api/')
    || normalizedPathname === '/qr'
    || normalizedPathname.startsWith('/qr/')
    || isFrontendRoute(normalizedPathname)
  ) {
    return false;
  }

  // Vite emits hashed files below /assets and copies public files such as
  // favicon.svg to the web root. Alias validation does not permit extensions,
  // so serving these files cannot take precedence over a normal public alias.
  return normalizedPathname.startsWith('/assets/') || path.extname(normalizedPathname) !== '';
}

export function resolveWebDistDir(): string | undefined {
  // The first path is used by the compiled server (server/dist/src), while the
  // second is used by ts-node during local development (server/src).
  const candidates = [
    path.resolve(__dirname, '../../../web/dist'),
    path.resolve(__dirname, '../../web/dist')
  ];

  return candidates.find(candidate => fs.existsSync(path.join(candidate, 'index.html')));
}

export function createStaticAssetMiddleware(distDir = resolveWebDistDir()): RequestHandler {
  const staticMiddleware = distDir ? express.static(distDir, { index: false }) : undefined;

  return (req, res, next) => {
    if (!staticMiddleware || !isStaticAssetRequest(req.path)) return next();
    return staticMiddleware(req, res, next);
  };
}

export function createSpaFallbackMiddleware(distDir = resolveWebDistDir()): RequestHandler {
  const indexPath = distDir ? path.join(distDir, 'index.html') : undefined;

  return (req, res, next) => {
    if (!indexPath || !isFrontendRoute(req.path)) return next();

    return res.sendFile(indexPath, error => {
      if (error) next(error);
    });
  };
}
