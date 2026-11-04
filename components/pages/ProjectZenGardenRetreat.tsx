import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectZenGardenRetreat() {
  return <ProjectDetails project={await getProject('project-zen-garden-retreat')} />;
}
