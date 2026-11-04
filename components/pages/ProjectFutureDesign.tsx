import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectFutureDesign() {
  return <ProjectDetails project={await getProject('project-future-design')} />;
}
