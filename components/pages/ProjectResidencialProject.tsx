import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectResidencialProject() {
  return <ProjectDetails project={await getProject('project-residencial-project')} />;
}
