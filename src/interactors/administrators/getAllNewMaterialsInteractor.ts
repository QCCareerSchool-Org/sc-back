// import type { PrismaClient } from '@prisma/client';

// import type { NewMaterialDTO } from '../../domain/newMaterialDTO.js';
// import { materialType } from '../../domain/newMaterialDTO.js';
// import type { ILoggerService } from '../../services/logger/index.js';
// import type { IUUIDService } from '../../services/uuid/index.js';
// import type { IInteractor } from '../index.js';
// import { Result } from '../result.js';
// import type { ResultType } from '../result.js';

// export type GetAllNewMaterialsRequestDTO = {
//   courseId: number;
// };

// export type GetAllNewMaterialsResponseDTO = NewMaterialDTO[];

// export class GetAllNewMaterialsInteractor implements IInteractor<GetAllNewMaterialsRequestDTO, GetAllNewMaterialsResponseDTO> {
//   public constructor(
//     private readonly prisma: PrismaClient,
//     private readonly uuidService: IUUIDService,
//     private readonly logger: ILoggerService,
//   ) { /* empty */ }

//   public async execute(request: GetAllNewMaterialsRequestDTO): Promise<ResultType<GetAllNewMaterialsResponseDTO>> {
//     try {
//       // find the materials
//       const materials = await this.prisma.newMaterial.findMany({
//         where: { courseId: request.courseId },
//         orderBy: [
//           { unitLetter: 'asc' },
//           { order: 'asc' },
//         ],
//       });

//       return Result.success(materials.map(l => ({
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
//       return Result.fail(err instanceof Error ? err : Error('unknown error'));
//     }
//   }
// }
