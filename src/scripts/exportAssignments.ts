import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const courseCode = 'CC';

async function main(): Promise<void> {
  const courses = await prisma.course.findMany({
    where: { code: courseCode },
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
                },
              },
            },
          },
        },
      },
    },
  });

  if (courses.length === 0) {
    console.error('No courses found');
    process.exit(1);
  }

  for (const course of courses) {

    console.log(`# ${course.name}\n`);

    for (const submission of course.newSubmissionTemplates) {
      console.log(`## Submission ${submission.unitLetter}\n`);

      for (const assignment of submission.newAssignmentTemplates) {
        console.log(`### Assignment ${assignment.assignmentNumber}\n`);

        for (const part of assignment.newPartTemplates) {
          console.log(`#### Part ${part.partNumber}\n`);

          for (const textBox of part.newTextBoxTemplates) {
            console.log(`Question: ${textBox.description ?? ''}\n`);
            console.log(`Answer Type: text box\n`);
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
