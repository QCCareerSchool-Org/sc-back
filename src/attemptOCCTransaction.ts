// import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

// export class OCCConflict extends Error { }

// export const attemptOCCTransaction = async <T>(transaction: () => Promise<T | false>, maxAttempts = 5, timeOut = 30_000): Promise<T> => {
//   const endTime = new Date().getTime() + timeOut;
//   let attempts = 0;
//   do {
//     attempts++;
//     try {
//       const result = await transaction();
//       if (result !== false) {
//         return result;
//       }
//     } catch (err) {
//       if (err instanceof PrismaClientKnownRequestError && err.code === 'P2028') {
//         // swallow error and retry
//       } else {
//         console.log('Transaction error', err);
//         throw err;
//       }
//     }
//   } while (attempts <= maxAttempts && new Date().getTime() < endTime);
//   throw new OCCConflict();
// };
