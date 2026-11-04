import ProjectDetails from '../ProjectDetails';
import { getProject } from '../../lib/portfolio';

export default async function ProjectMinimalistLoft() {
  return <ProjectDetails project={await getProject('project-minimalist-loft')} />;
}
