import { PrismaClient } from '@prisma/client';
// import { uuidService } from '../services/index.js';

const prisma = new PrismaClient();

const schoolSlug = 'makeup';

async function main(): Promise<void> {
  const schools = await prisma.school.findMany({
    where: { slug: schoolSlug },
    include: {
      courses: {
        where: { enabled: true },
        include: {
          newSubmissionTemplates: {
            orderBy: { order: 'asc' },
            include: {
              newAssignmentTemplates: {
                orderBy: { assignmentNumber: 'asc' },
                include: {
                  newPartTemplates: {
                    orderBy: { partNumber: 'asc' },
                    include: {
                      newTextBoxTemplates: {
                        orderBy: { order: 'asc' },
                      },
                      newUploadSlotTemplates: {
                        orderBy: { order: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (schools.length === 0) {
    console.error('School not found');
    process.exit(1);
  }

  const school = schools[0];

  for (const course of school.courses) {
    // console.log(`Course ID: ${course.courseId}`);
    console.log(`\n# ${course.name}\n`);

    for (const submission of course.newSubmissionTemplates) {
      // console.log(`Submission ID: ${uuidService.binToUUID(submission.submissionTemplateId)}\n`);
      console.log(`\n## Submission ${submission.unitLetter}\n`);

      for (const assignment of submission.newAssignmentTemplates) {
        // console.log(`Assignment ID: ${uuidService.binToUUID(assignment.assignmentTemplateId)}\n`);
        console.log(`\n### Assignment ${assignment.assignmentNumber}\n`);

        for (const part of assignment.newPartTemplates) {
          console.log(`\n#### Part ${part.partNumber}\n`);

          for (const textBox of part.newTextBoxTemplates) {
            console.log(`Question: ${textBox.description ?? ''}`);
            console.log(`Answer Type: text box`);
          }

          for (const upload of part.newUploadSlotTemplates) {
            console.log(`Upload: ${upload.label}`);
            console.log(`Type: ${upload.allowedTypes}`);
          }
        }
      }
    }
  }

  await prisma.$disconnect();

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
