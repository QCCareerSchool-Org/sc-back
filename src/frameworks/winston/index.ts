import { createLogger, format, transports } from 'winston';

/**
 * If the data passed to the logger is an instance of Error, transform the stack trace into an array
 * @param _key
 * @param value
 */
const replacer = (_key: string, value: unknown): unknown => {
  if (value instanceof Error) {
    return Object.getOwnPropertyNames(value).reduce((previousValue, currentValue) => {
      if (currentValue === 'stack') {
        return {
          ...previousValue,
          stack: value.stack?.split('\n').map(v => {
            v = v.trim();
            return v.startsWith('at ') ? v.slice(3) : v;
          }),
        };
      }
      return {
        ...previousValue,
        [currentValue]: value[currentValue as keyof Error],
      };
    }, {});
  }
  return value;
};

export const winston = createLogger({
  level: 'info',
  // format: format.json(),
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.json({ space: 2, replacer }),
  ),
  // defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  winston.add(new transports.Console({
    format: format.simple(),
  }));
}
