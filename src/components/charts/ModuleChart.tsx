import { AshbyGraphData } from '../../engine/ashbyChart';
import { BeamGraphData } from '../../engine/beamSfdBmd';
import { CasagrandeGraphData } from '../../engine/casagrande';
import { EulerBucklingGraphData } from '../../engine/eulerBuckling';
import { GoodmanGraphData } from '../../engine/goodman';
import { MohrCoulombGraphData } from '../../engine/mohrCoulomb';
import { MohrsCircleGraphData } from '../../engine/mohrsCircle';
import { PmInteractionGraphData } from '../../engine/pmInteraction';
import { SnCurveGraphData } from '../../engine/snCurve';
import { StressStrainGraphData } from '../../engine/stressStrain';
import { ModuleId } from '../../engine/types';
import { AshbyPlot } from './plots/AshbyPlot';
import { BeamSfdBmdPlot } from './plots/BeamSfdBmdPlot';
import { CasagrandePlot } from './plots/CasagrandePlot';
import { EulerBucklingPlot } from './plots/EulerBucklingPlot';
import { GoodmanPlot } from './plots/GoodmanPlot';
import { MohrCoulombPlot } from './plots/MohrCoulombPlot';
import { MohrsCirclePlot } from './plots/MohrsCirclePlot';
import { PmInteractionPlot } from './plots/PmInteractionPlot';
import { SnCurvePlot } from './plots/SnCurvePlot';
import { StressStrainPlot } from './plots/StressStrainPlot';

interface ModuleChartProps {
  moduleId: ModuleId;
  graphData: unknown;
}

export function ModuleChart({ moduleId, graphData }: ModuleChartProps) {
  if (!graphData) return null;

  switch (moduleId) {
    case 'mohrs-circle':
      return <MohrsCirclePlot data={graphData as MohrsCircleGraphData} />;
    case 'stress-strain':
      return <StressStrainPlot data={graphData as StressStrainGraphData} />;
    case 'sn-curve':
      return <SnCurvePlot data={graphData as SnCurveGraphData} />;
    case 'goodman-haigh':
      return <GoodmanPlot data={graphData as GoodmanGraphData} />;
    case 'beam-sfd-bmd':
      return <BeamSfdBmdPlot data={graphData as BeamGraphData} />;
    case 'mohr-coulomb':
      return <MohrCoulombPlot data={graphData as MohrCoulombGraphData} />;
    case 'ashby-chart':
      return <AshbyPlot data={graphData as AshbyGraphData} />;
    case 'euler-buckling':
      return <EulerBucklingPlot data={graphData as EulerBucklingGraphData} />;
    case 'pm-interaction':
      return <PmInteractionPlot data={graphData as PmInteractionGraphData} />;
    case 'casagrande':
      return <CasagrandePlot data={graphData as CasagrandeGraphData} />;
  }
}
