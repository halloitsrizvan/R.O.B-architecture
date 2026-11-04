import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectTheGlassHouse() {
  return <ProjectDetails project={await getProject('project-the-glass-house')} />;
}
