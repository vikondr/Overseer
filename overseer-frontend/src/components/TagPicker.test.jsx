import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagPicker from './TagPicker';

/**
 * Smoke tests for TagPicker — a small, dependency-free component that exercises
 * the test infrastructure (Vitest + jsdom + Testing Library) end-to-end while
 * pinning down its core behaviour: click-to-toggle, controlled selection,
 * and the `max` upper bound.
 */
describe('<TagPicker />', () => {
  it('renders every option from the provided list', () => {
    render(<TagPicker selected={[]} onChange={() => {}} options={['Red', 'Blue', 'Green']} />);

    expect(screen.getByRole('button', { name: 'Red' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Green' })).toBeInTheDocument();
  });

  it('clicking an unselected tag adds it to the selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TagPicker selected={[]} onChange={onChange} options={['Red', 'Blue']} />);
    await user.click(screen.getByRole('button', { name: 'Red' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['Red']);
  });

  it('clicking a selected tag removes it from the selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TagPicker selected={['Red', 'Blue']} onChange={onChange} options={['Red', 'Blue']} />);
    await user.click(screen.getByRole('button', { name: 'Red' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['Blue']);
  });

  it('disables further additions once `max` is reached', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TagPicker
        selected={['Red']}
        onChange={onChange}
        options={['Red', 'Blue']}
        max={1}
      />
    );

    const blueButton = screen.getByRole('button', { name: 'Blue' });
    expect(blueButton).toBeDisabled();

    await user.click(blueButton);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('always allows deselecting an already-selected tag even at the cap', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TagPicker
        selected={['Red']}
        onChange={onChange}
        options={['Red', 'Blue']}
        max={1}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Red' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
