/** @jest-environment node */
import en from '../../messages/en.json';
import pt from '../../messages/pt.json';

/** Every key path in a message tree, like "Home.title". */
function keys(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('messages', () => {
  it('Portuguese and English have exactly the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(pt).sort());
  });

  it('no message is empty', () => {
    for (const tree of [pt, en]) {
      const empty = keys(tree).filter((path) => {
        const value = path.split('.').reduce<unknown>((node, k) => (node as never)[k], tree);
        return typeof value !== 'string' || value.trim() === '';
      });
      expect(empty).toEqual([]);
    }
  });
});
