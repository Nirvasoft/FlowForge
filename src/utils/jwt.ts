import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';

/**
 * JWT payload for access tokens
 */
export interface AccessTokenPayload {
  userId: string;
  accountId: string;
  email: string;
  type: 'access';
}

/**
 * JWT payload for refresh tokens
 */
export interface RefreshTokenPayload {
  userId: string;
  accountId: string;
  email: string;
  sessionId: string;
  type: 'refresh';
}

/**
 * Token pair returned after authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Parse duration string (e.g., "15m", "7d") to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Generate access and refresh tokens
 */
export async function generateTokenPair(
  fastify: FastifyInstance,
  payload: {
    userId: string;
    accountId: string;
    email: string;
    sessionId: string;
  }
): Promise<TokenPair> {
  const accessExpiresIn = parseDuration(config.jwt.accessExpiry);
  const refreshExpiresIn = parseDuration(config.jwt.refreshExpiry);

  const accessPayload: AccessTokenPayload = {
    userId: payload.userId,
    accountId: payload.accountId,
    email: payload.email,
    type: 'access',
  };

  const refreshPayload: RefreshTokenPayload = {
    userId: payload.userId,
    accountId: payload.accountId,
    email: payload.email,
    sessionId: payload.sessionId,
    type: 'refresh',
  };

  const accessToken = fastify.jwt.sign(accessPayload, {
    expiresIn: accessExpiresIn,
  });

  const refreshToken = fastify.jwt.sign(refreshPayload, {
    expiresIn: refreshExpiresIn,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: accessExpiresIn,
  };
}

/**
 * Verify and decode a token
 */
export function verifyToken<T extends Record<string, unknown>>(
  fastify: FastifyInstance,
  token: string
): T {
  return fastify.jwt.verify(token) as T;
}
