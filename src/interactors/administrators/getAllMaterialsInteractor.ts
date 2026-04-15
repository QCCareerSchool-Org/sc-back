// import type { PrismaClient } from '@prisma/client';

// import type { MaterialDTO, materialType } from '../../domain/materialDTO.js';
// import type { ILoggerService } from '../../services/logger/index.js';
// import type { IUUIDService } from '../../services/uuid/index.js';
// import type { IInteractor } from '../index.js';
// import { failure, success } from 'generic-result-type';
// import type { Result as ResultType } from 'generic-result-type';

// export type GetAllMaterialsRequestDTO = {
//   courseId: number;
// };

// export type GetAllMaterialsResponseDTO = MaterialDTO[];

// export class GetAllMaterialsInteractor implements IInteractor<GetAllMaterialsRequestDTO, GetAllMaterialsResponseDTO> {
//   public constructor(
//     private readonly prisma: PrismaClient,
//     private readonly uuidService: IUUIDService,
//     private readonly logger: ILoggerService,
//   ) { /* empty */ }

//   public async execute(request: GetAllMaterialsRequestDTO): Promise<ResultType<GetAllMaterialsResponseDTO>> {
//     try {
//       // find the materials
//       const materials = await this.prisma.material.findMany({
//         where: { courseId: request.courseId },
//         orderBy: [
//           { unitLetter: 'asc' },
//           { order: 'asc' },
//         ],
//       });

//       return success(materials.map(l => ({
//         materialId: this.uuidService.binToUUID(l.materialId),
//         courseId: l.courseId,
//         type: materialType(l.type),
//         title: l.title,
//         description: l.description,
//         unitLetter: l.unitLetter,
//         order: l.order,
//         filename: l.filename,
//         mimeTypeId: l.mimeTypeId,
//         externalData: l.externalData,
//       })));

//     } catch (err) {
//       this.logger.error('error getting new materials', err instanceof Error ? err.message : err);
//       return failure(err instanceof Error ? err : Error('unknown error'));
//     }
//   }
// }
