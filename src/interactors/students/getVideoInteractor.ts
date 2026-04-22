import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { VideoDTO } from '../../domain/videoDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type GetVideoRequestDTO = {
  studentId: number;
  /** uuid */
  videoId: string;
};

export type GetVideoResponseDTO = VideoDTO;

abstract class GetVideoError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class GetVideoNotFound extends GetVideoError { }

export class GetVideoInteractor extends StudentInteractor<GetVideoRequestDTO, GetVideoResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, videoId }: GetVideoRequestDTO): Promise<ResultType<GetVideoResponseDTO>> {
    try {
      const videoIdBin = this.uuidService.uuidToBin(videoId);

      const video = await this.prisma.video.findFirst({
        where: {
          videoId: videoIdBin,
          OR: [
            { units: { some: { unit: { course: { enrollments: { some: { studentId } } } } } } },
            { unrestricted: true },
          ],
        },
      });

      if (!video) {
        return failure(new GetVideoNotFound());
      }

      return success({
        videoId: this.uuidService.binToUUID(video.videoId),
        src: video.src,
        posterSrc: video.posterSrc,
        captionSrc: video.captionSrc,
        title: video.title,
        description: video.description,
      });

    } catch (err) {
      this.logger.error('error getting video', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
