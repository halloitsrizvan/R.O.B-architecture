import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectMountainEscape() {
  return <ProjectDetails project={await getProject('project-mountain-escape')} />;
}
