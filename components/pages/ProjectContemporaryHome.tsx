import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectContemporaryHome() {
  return <ProjectDetails project={await getProject('project-contemporary-home')} />;
}
