import Image, { type StaticImageData } from 'next/image';
import type { ProjectImage } from '../data/projects';
import image1 from '../public/assets/image1.jpg';
import image2 from '../public/assets/image2.jpg';
import image3 from '../public/assets/image3.jpg';
import image4 from '../public/assets/image4.jpg';
import image5 from '../public/assets/image5.jpg';
import image6 from '../public/assets/image6.jpg';

const localImages: Record<string, StaticImageData> = {
  '/assets/image1.jpg': image1,
  '/assets/image2.jpg': image2,
  '/assets/image3.jpg': image3,
  '/assets/image4.jpg': image4,
  '/assets/image5.jpg': image5,
  '/assets/image6.jpg': image6,
};

export default function PortfolioImage({
  image,
  sizes,
  eager = false,
}: {
  image: ProjectImage;
  sizes: string;
  eager?: boolean;
}) {
  const loading = eager ? 'eager' : 'lazy';
  const fetchPriority = eager ? 'high' : undefined;
  const local = localImages[image.src];
  if (local)
    return (
      <Image
        src={local}
        alt={image.alt}
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
      />
    );
  // Draft media needs cookies, which Next's optimizer does not forward. Preserve
  // the original endpoint and its authorization/cache policy for uploaded files.
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      alt={image.alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
    />
  );
}
