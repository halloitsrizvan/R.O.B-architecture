import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectCurveResidence() {
  return <ProjectDetails project={await getProject('project-curve-residence')} />;
}
