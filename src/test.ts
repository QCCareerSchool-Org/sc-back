import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime';
import { attemptOCCTransaction } from './attemptOCCTransaction';
import { uuidService } from './services';

const prisma = new PrismaClient();

const updateIncome = async (familyId: string, personId: string, income: number): Promise<void> => {
  const familyIdBin = uuidService.uuidToBin(familyId);
  const personIdBin = uuidService.uuidToBin(personId);

  await attemptOCCTransaction(async () => {
    const family = await prisma.family.findUnique({
      where: { familyId: familyIdBin },
      include: { persons: true },
    });

    if (!family) {
      throw Error('Family not found');
    }

    const person = family.persons.find(p => p.personId.compare(personIdBin) === 0);

    if (!person) {
      throw Error('Person not found');
    }

    const newCombinedIncome = family.persons
      .filter(p => p.personId.compare(personIdBin) !== 0)
      .reduce((sum, p) => sum.plus(p.income), new Decimal(0)).toNumber() + income;

    // if we are only dealing with the data base, do prisma.$transaction([ ... ]);
    // const [ , batchPayload ] = await prisma.$transaction([
    //   transaction.person.update({ data: { income }, where: { personId: personIdBin } }),
    //   transaction.family.updateMany({
    //     data: { combinedIncome: newCombinedIncome, entityVersion: { increment: 1 } },
    //     where: { familyId: familyIdBin, entityVersion: family.entityVersion },
    //   }),
    // ]);
    // return batchPayload.count;

    // if we have to deal with external systems, do prisma.$transaction(async transaction => { ... })
    const count = await prisma.$transaction(async transaction => {
      await transaction.person.update({ data: { income }, where: { personId: personIdBin } });

      const batchPayload = await transaction.family.updateMany({
        data: { combinedIncome: newCombinedIncome, entityVersion: { increment: 1 } },
        where: { familyId: familyIdBin, entityVersion: family.entityVersion },
      });

      if (batchPayload.count === 0) {
        return 0;
      }

      // do something else that might fail

      return batchPayload.count;
    });

    return count;
  });
};

updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5e6bfe8b-a790-11ec-a6f4-bc764e017ab0', 10).then(async () => {
  return updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5f6b2cf9-a790-11ec-a6f4-bc764e017ab0', 20);
}).then(async () => {
  return updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5ef7db1f-a790-11ec-a6f4-bc764e017ab0', 40);
}).then(async () => {
  return Promise.all([
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5e6bfe8b-a790-11ec-a6f4-bc764e017ab0', 100),
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5ef7db1f-a790-11ec-a6f4-bc764e017ab0', 200),
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5f6b2cf9-a790-11ec-a6f4-bc764e017ab0', 300),
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5e6bfe8b-a790-11ec-a6f4-bc764e017ab0', 400),
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5e6bfe8b-a790-11ec-a6f4-bc764e017ab0', 200),
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5e6bfe8b-a790-11ec-a6f4-bc764e017ab0', 200),
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5e6bfe8b-a790-11ec-a6f4-bc764e017ab0', 200),
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5e6bfe8b-a790-11ec-a6f4-bc764e017ab0', 200),
    updateIncome('418a8dc0-a790-11ec-a6f4-bc764e017ab0', '5e6bfe8b-a790-11ec-a6f4-bc764e017ab0', 200),
  ]);
}).catch(console.error);
