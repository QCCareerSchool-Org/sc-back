import type { PrismaClient } from '@prisma/client';

import type { VideoDTO } from '..//domain/videoDTO.js';
import type { ILoggerService } from '../services/logger/index.js';
import type { IUUIDService } from '../services/uuid/index.js';
import type { ResultType } from './result.js';
import { Result } from './result.js';
import type { IInteractor } from './index.js';

export type GetVideoRequestDTO = {
  /** uuid */
  videoId: string;
};

export type GetVideoResponseDTO = VideoDTO;

export class GetVideoNotFound extends Error { }
export class GetVideoRestricted extends Error { }

export class GetVideoInteractor implements IInteractor<GetVideoRequestDTO, GetVideoResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ videoId }: GetVideoRequestDTO): Promise<ResultType<GetVideoResponseDTO>> {
    try {
      const videoIdBin = this.uuidService.uuidToBin(videoId);

      const video = await this.prisma.video.findFirst({
        where: { videoId: videoIdBin },
      });

      if (!video) {
        return Result.fail(new GetVideoNotFound());
      }

      if (!video.unrestricted) {
        return Result.fail(new GetVideoRestricted());
      }

      return Result.success({
        videoId: this.uuidService.binToUUID(video.videoId),
        src: video.src,
        posterSrc: video.posterSrc,
        captionSrc: video.captionSrc,
        title: video.title,
        description: video.description,
      });

    } catch (err) {
      this.logger.error('error getting video', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
