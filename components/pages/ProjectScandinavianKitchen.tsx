import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectScandinavianKitchen() {
  return <ProjectDetails project={await getProject('project-scandinavian-kitchen')} />;
}
