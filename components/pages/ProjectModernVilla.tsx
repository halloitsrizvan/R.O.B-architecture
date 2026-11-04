import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectModernVilla() {
  return <ProjectDetails project={await getProject('project-modern-villa')} />;
}
