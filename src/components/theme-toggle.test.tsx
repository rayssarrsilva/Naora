import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import pt from '../../messages/pt.json';
import { ThemeToggle } from './theme-toggle';

function renderToggle() {
  return render(
    <NextIntlClientProvider locale="pt" messages={pt}>
      <ThemeToggle className="" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
  // jsdom has no matchMedia: start from a device set to light.
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
});

describe('ThemeToggle', () => {
  it('offers the dark theme when the page is light', () => {
    renderToggle();
    const button = screen.getByRole('button', { name: 'Usar tema escuro' });
    expect(button).toHaveAttribute('data-state', 'light');
  });

  it('switches to dark, remembers the choice and offers light next', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('naora:theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Usar tema claro' })).toBeInTheDocument();
  });
});
