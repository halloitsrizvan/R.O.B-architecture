export const revalidate = 60;

import SitePage from '../components/SitePage';
import { pageMetadata } from '../lib/metadata';

export const metadata = pageMetadata('');
export default function Home() {
  return <SitePage slug="" />;
}
