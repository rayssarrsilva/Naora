/** @jest-environment node */
import { defaultWeek, minutesToTime, timeToMinutes, weekOrder } from './hours';
import { centsToInput, formatReais, parseReais } from './money';
import { businessSchema, hoursSchema, serviceSchema } from './schema';
import { isValidSlug, slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Studio da Ana Lú', 'studio-da-ana-lu'],
    ['  Barbearia  do Zé!! ', 'barbearia-do-ze'],
    ['Salão 2000', 'salao-2000'],
    ['Ç@fé & Unha', 'c-fe-unha'],
  ])('%s → %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });

  it('never returns more than 40 characters or a trailing hyphen', () => {
    const slug = slugify('a'.repeat(39) + ' bbbb');
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('isValidSlug', () => {
  it.each(['studio-da-ana', 'salao2000', 'abc'])('accepts %s', (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each(['ab', '-abc', 'abc-', 'a--b', 'Abc', 'abc_def', 'painel', 'api', 'a'.repeat(41)])(
    'rejects %s',
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
    },
  );
});

describe('parseReais', () => {
  it.each([
    ['45', 4500],
    ['45,5', 4550],
    ['45,50', 4550],
    ['R$ 1.234,90', 123490],
    ['45.50', 4550],
    ['0', 0],
  ])('%s → %i cents', (text, cents) => {
    expect(parseReais(text)).toBe(cents);
  });

  it.each(['', 'abc', '45,505', '1.23,4', '-10', '1,2,3'])('rejects %p', (text) => {
    expect(parseReais(text)).toBeNull();
  });
});

describe('formatReais and centsToInput', () => {
  it('formats cents as Brazilian reais', () => {
    expect(formatReais(4550)).toBe('R$ 45,50');
  });

  it('writes cents back in the format the input accepts', () => {
    expect(centsToInput(4550)).toBe('45,50');
    expect(parseReais(centsToInput(123490))).toBe(123490);
  });
});

describe('hours', () => {
  it('converts times both ways', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('9:30')).toBeNull();
  });

  it('starts the week on Monday and opens Monday to Saturday by default', () => {
    expect(weekOrder[0]).toBe(1);
    const week = defaultWeek();
    expect(week.filter((d) => d.open).map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('businessSchema', () => {
  it('lowercases the address and checks it', () => {
    expect(businessSchema.parse({ name: 'Studio Ana', slug: 'Studio-Ana' }).slug).toBe(
      'studio-ana',
    );
    expect(businessSchema.safeParse({ name: 'Studio Ana', slug: 'painel' }).success).toBe(false);
  });
});

describe('serviceSchema', () => {
  const valid = { name: 'Corte feminino', durationMin: '45', price: '80,00', deposit: '20' };

  it('turns the form into cents and minutes', () => {
    expect(serviceSchema.parse(valid)).toEqual({
      name: 'Corte feminino',
      durationMin: 45,
      price: 8000,
      deposit: 2000,
    });
  });

  it('rejects a deposit higher than the price, on the deposit field', () => {
    const result = serviceSchema.safeParse({ ...valid, deposit: '90' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ['deposit'], message: 'depositTooHigh' });
  });

  it.each([
    ['durationMin', '7', 'durationStep'],
    ['durationMin', '0', 'durationInvalid'],
    ['durationMin', '500', 'durationInvalid'],
    ['price', '0', 'priceInvalid'],
    ['price', 'oito', 'priceInvalid'],
    ['name', 'A', 'nameShort'],
  ])('%s = %p fails with %s', (field, value, message) => {
    const result = serviceSchema.safeParse({ ...valid, [field]: value });
    expect(result.error?.issues.map((i) => i.message)).toContain(message);
  });
});

describe('hoursSchema', () => {
  it('accepts the default week', () => {
    expect(hoursSchema.safeParse({ days: defaultWeek() }).success).toBe(true);
  });

  it('rejects a day that closes before it opens, but not a closed day', () => {
    const days = defaultWeek();
    days[0] = { ...days[0]!, opensAt: '18:00', closesAt: '09:00' };
    days[6] = { ...days[6]!, open: false, opensAt: 'xx', closesAt: 'yy' };
    const result = hoursSchema.safeParse({ days });
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['days', 0, 'closesAt'],
      message: 'closesBeforeOpens',
    });
  });

  it('rejects a week with a repeated day', () => {
    const days = defaultWeek();
    days[1] = { ...days[1]!, weekday: days[0]!.weekday };
    expect(hoursSchema.safeParse({ days }).success).toBe(false);
  });
});
