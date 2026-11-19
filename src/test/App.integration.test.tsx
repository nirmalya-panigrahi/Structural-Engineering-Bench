import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('StrataBench Engineering Workbench Integration', () => {
  it('renders initial Mohr Circle workbench with SVG graph, outputs, and fine-print tooltip', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /Mohr's Circle/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mohr's Circle/i })).toBeInTheDocument();

    const infoBtn = screen.getByRole('button', { name: /Fine print for Normal Stress X/i });
    await user.click(infoBtn);
    expect(screen.getByRole('tooltip')).toHaveTextContent(/Normal Stress X — Fine Print/i);
  });

  it('switches to Casagrande Plasticity Chart, updates numeric inputs, and updates USCS output', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /10\.\s*Casagrande USCS/i }));
    expect(screen.getByRole('heading', { name: /Casagrande Plasticity Chart/i })).toBeInTheDocument();

    const llInput = screen.getByRole('spinbutton', { name: /Liquid Limit/i }) as HTMLInputElement;
    await user.clear(llInput);
    await user.type(llInput, '72');

    const plInput = screen.getByRole('spinbutton', { name: /Plastic Limit/i }) as HTMLInputElement;
    await user.clear(plInput);
    await user.type(plInput, '25');

    expect(screen.getByText(/USCS Class: CH/i)).toBeInTheDocument();
  });

  it('shows validation error state on adversarial PL > LL input and recovers via Restore Valid Defaults', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /10\.\s*Casagrande USCS/i }));

    const llInput = screen.getByRole('spinbutton', { name: /Liquid Limit/i }) as HTMLInputElement;
    const plInput = screen.getByRole('spinbutton', { name: /Plastic Limit/i }) as HTMLInputElement;

    await user.clear(llInput);
    await user.type(llInput, '20');
    await user.clear(plInput);
    await user.type(plInput, '55');

    expect(screen.getByText(/Invalid Input Parameters — Calculation Halted/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Restore Valid Defaults/i }));
    expect(screen.getByText(/USCS Class: CL/i)).toBeInTheDocument();
  });

  it('switches to Beam SFD/BMD and shows SVG diagrams and Clear/Empty state recovery', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /05\.\s*Beam SFD \/ BMD/i }));
    expect(screen.getByRole('img', { name: /Beam Shear Force and Bending Moment Diagrams/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Clear numeric inputs/i }));
    expect(screen.getByText(/No Numeric Parameters Entered/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Load Default Benchmark/i }));
    expect(screen.getByRole('img', { name: /Beam Shear Force and Bending Moment Diagrams/i })).toBeInTheDocument();
  });
});
