import { db } from '@/lib/db/client';
import { defaultWeek } from './hours';
import {
  addService,
  businessForUser,
  createBusiness,
  deleteService,
  getHours,
  listServices,
  publicBusiness,
  saveHours,
  setServiceActive,
} from './repository';

async function newUser(name: string) {
  return db().user.create({
    data: { email: `${name}-${crypto.randomUUID()}@test.naora.app`, name },
  });
}

const haircut = { name: 'Corte', durationMin: 45, price: 8000, deposit: 2000 };

beforeEach(async () => {
  await db().$executeRawUnsafe(
    'TRUNCATE "OpeningHours", "Service", "Membership", "Account", "Business", "User" CASCADE',
  );
});

afterAll(async () => {
  await db().$disconnect();
});

describe('createBusiness', () => {
  it('makes the user the owner and opens Monday to Saturday, 9:00 to 18:00', async () => {
    const ana = await newUser('ana');
    const result = await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio-ana' });
    expect(result.ok).toBe(true);
    expect(await businessForUser(ana.id)).toMatchObject({ slug: 'studio-ana' });

    const hours = await getHours((await businessForUser(ana.id))!.id);
    expect(hours.filter((d) => d.open).map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(hours[0]).toMatchObject({ opensAt: '09:00', closesAt: '18:00' });
  });

  it('refuses an address someone else already uses', async () => {
    const ana = await newUser('ana');
    const bia = await newUser('bia');
    await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio' });
    await expect(createBusiness(bia.id, { name: 'Studio Bia', slug: 'studio' })).resolves.toEqual({
      ok: false,
      error: 'slugTaken',
    });
    expect(await businessForUser(bia.id)).toBeNull();
  });

  it('allows one business per owner', async () => {
    const ana = await newUser('ana');
    await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio-ana' });
    await expect(createBusiness(ana.id, { name: 'Outro', slug: 'outro' })).resolves.toEqual({
      ok: false,
      error: 'alreadyHasBusiness',
    });
  });
});

describe('tenant isolation', () => {
  it("never lets one business delete or change another's service", async () => {
    const ana = await newUser('ana');
    const intruder = await newUser('intruder');
    await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio-ana' });
    await createBusiness(intruder.id, { name: 'Outro', slug: 'outro' });
    const service = (await addService(ana.id, haircut))!;

    await expect(deleteService(intruder.id, service.id)).resolves.toBe(false);
    await expect(setServiceActive(intruder.id, service.id, false)).resolves.toBe(false);

    const anaBusiness = (await businessForUser(ana.id))!;
    expect(await listServices(anaBusiness.id)).toEqual([
      expect.objectContaining({ id: service.id, active: true }),
    ]);
  });

  it('answers a foreign id exactly like a missing one', async () => {
    const ana = await newUser('ana');
    const intruder = await newUser('intruder');
    await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio-ana' });
    await createBusiness(intruder.id, { name: 'Outro', slug: 'outro' });
    const service = (await addService(ana.id, haircut))!;

    const foreign = await deleteService(intruder.id, service.id);
    const missing = await deleteService(intruder.id, 'does-not-exist');
    expect(foreign).toBe(missing);
  });

  it('does nothing for a user without a business', async () => {
    const nobody = await newUser('nobody');
    await expect(addService(nobody.id, haircut)).resolves.toBeNull();
    await expect(saveHours(nobody.id, defaultWeek())).resolves.toBe(false);
  });
});

describe('services', () => {
  it('stores prices in cents and lists them in the order they were added', async () => {
    const ana = await newUser('ana');
    await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio-ana' });
    await addService(ana.id, haircut);
    await addService(ana.id, { name: 'Escova', durationMin: 30, price: 5000, deposit: 0 });
    const business = (await businessForUser(ana.id))!;
    expect((await listServices(business.id)).map((s) => [s.name, s.priceCents])).toEqual([
      ['Corte', 8000],
      ['Escova', 5000],
    ]);
  });

  it('deletes only the chosen service', async () => {
    const ana = await newUser('ana');
    await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio-ana' });
    const first = (await addService(ana.id, haircut))!;
    await addService(ana.id, { ...haircut, name: 'Escova' });
    await expect(deleteService(ana.id, first.id)).resolves.toBe(true);
    const business = (await businessForUser(ana.id))!;
    expect((await listServices(business.id)).map((s) => s.name)).toEqual(['Escova']);
  });
});

describe('saveHours', () => {
  it('replaces the whole week', async () => {
    const ana = await newUser('ana');
    await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio-ana' });
    const week = defaultWeek().map((day) =>
      day.weekday === 6 ? { ...day, open: false } : { ...day, opensAt: '10:00' },
    );
    await saveHours(ana.id, week);
    const business = (await businessForUser(ana.id))!;
    const hours = await getHours(business.id);
    expect(hours.find((d) => d.weekday === 6)?.open).toBe(false);
    expect(hours.find((d) => d.weekday === 1)).toMatchObject({ open: true, opensAt: '10:00' });
  });
});

describe('publicBusiness', () => {
  it('shows only active services, and nothing for an unknown address', async () => {
    const ana = await newUser('ana');
    await createBusiness(ana.id, { name: 'Studio Ana', slug: 'studio-ana' });
    await addService(ana.id, haircut);
    const hidden = (await addService(ana.id, { ...haircut, name: 'Pausado' }))!;
    await setServiceActive(ana.id, hidden.id, false);

    const page = await publicBusiness('studio-ana');
    expect(page?.services.map((s) => s.name)).toEqual(['Corte']);
    // The id is public now: it is what the booking link uses. Internal flags stay out.
    expect(page?.services[0]).not.toHaveProperty('active');
    expect(await publicBusiness('nao-existe')).toBeNull();
  });
});
