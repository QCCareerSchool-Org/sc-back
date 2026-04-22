```typescript
import { PrismaClient } from '@prisma/client';

import type { ILoggerService } from '../services/logger';
import { Result, ResultType } from './result';
import { IInteractor } from '.';

export type GetFoosRequestDTO = {
  studentId: number;
};

export type GetFoosResponseDTO = Array<{
  unitId: number;
}>;

abstract class GetFoosError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class GetFoosInvalidBar extends GetFoosError { }

export class GetFoosInteractor implements IInteractor<GetFoosRequestDTO, GetFoosResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId }: GetFoosRequestDTO): Promise<ResultType<GetFoosResponseDTO>> {
    try {

      const foo = this.prisma.foo.findMany({ where: { studentId } });

      if (foo.length > 100) {
        return Result.fail(new GetFoosInvalidBar());
      }

      return Result.success(foo);

    } catch (err) {
      this.logger.error('error getting foos', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
```
