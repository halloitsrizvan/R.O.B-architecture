import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectUrbanPlaza() {
  return <ProjectDetails project={await getProject('project-urban-plaza')} />;
}
