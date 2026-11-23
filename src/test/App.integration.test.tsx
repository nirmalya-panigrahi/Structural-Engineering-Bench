import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

describe('StrataBench Engineering Workbench Integration', () => {
  it('renders initial Mohr Circle workbench with SVG graph, outputs, and fine-print tooltip data values', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /Mohr's Circle/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mohr's Circle/i })).toBeInTheDocument();

    const infoBtn = screen.getByRole('button', { name: /Fine print for Normal Stress X/i });
    await user.click(infoBtn);
    const inputTooltip = screen.getByRole('tooltip');
    expect(inputTooltip).toHaveTextContent(/Normal Stress X — Fine Print/i);
    expect(inputTooltip).toHaveTextContent(/80 MPa/i);
    expect(inputTooltip).toHaveTextContent(/Slider Range/i);

    const outputInfoBtn = screen.getByRole('button', { name: /Fine print for Major Principal Stress/i });
    await user.click(outputInfoBtn);
    const tooltips = screen.getAllByRole('tooltip');
    const outputTooltip = tooltips[tooltips.length - 1];
    expect(outputTooltip).toHaveTextContent(/Computed/i);
    expect(outputTooltip).toHaveTextContent(/Full Precision/i);
  });

  it('displays floating chart hover tooltip with coordinates and analytical data values on pointer move', () => {
    render(<App />);

    const svg = screen.getByRole('img', { name: /Mohr's Circle/i });
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 680,
      bottom: 420,
      width: 680,
      height: 420,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(svg, { clientX: 340, clientY: 200 });
    const chartTooltip = screen.getByTestId('chart-hover-tooltip');
    expect(chartTooltip).toHaveTextContent(/MPa/i);
    expect(chartTooltip).toHaveTextContent(/2D Circle ±τ\(σ\)/i);
    expect(chartTooltip).toHaveTextContent(/Principals σ₁ \/ σ₂/i);

    fireEvent.pointerLeave(svg);
    expect(screen.queryByTestId('chart-hover-tooltip')).not.toBeInTheDocument();
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
