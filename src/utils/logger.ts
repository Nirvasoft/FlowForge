import pino from 'pino';
import { config } from '../config/index.js';

/**
 * Pino logger instance with pretty printing in development
 */
export const logger = pino({
  level: config.logging.level,
  ...(config.isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  base: {
    env: config.env,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'passwordHash'],
    censor: '[REDACTED]',
  },
});

/**
 * Create a child logger with additional context
 */
export function createLogger(context: string) {
  return logger.child({ context });
}

export type Logger = typeof logger;
