import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectTropicalHome() {
  return <ProjectDetails project={await getProject('project-tropical-home')} />;
}
